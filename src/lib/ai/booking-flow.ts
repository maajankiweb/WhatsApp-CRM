import { type SupabaseClient } from '@supabase/supabase-js'
import { generateReply } from './generate'
import { format, parse, addDays } from 'date-fns'

interface BookingState {
  patient_name?: string
  patient_age?: string
  reason_for_visit?: string
  doctor_id?: string
  doctor_name?: string
  appointment_date?: string
  appointment_time?: string
}

/**
 * Calculates open appointments slots for a doctor on a specific date.
 */
export async function getAvailableSlots(
  supabase: SupabaseClient,
  doctorId: string,
  dateStr: string // 'YYYY-MM-DD'
): Promise<string[]> {
  try {
    const date = new Date(dateStr)
    const dayName = format(date, 'EEEE') // e.g. 'Monday'

    // Get doctor details
    const { data: doctor } = await supabase
      .from('doctors')
      .select('clinic_id, available_days, available_start_time, available_end_time')
      .eq('id', doctorId)
      .maybeSingle()

    if (!doctor) return []

    // Verify if doctor works on this day
    const availableDays = Array.isArray(doctor.available_days)
      ? doctor.available_days
      : JSON.parse(doctor.available_days || '[]')

    if (!availableDays.includes(dayName)) {
      return []
    }

    // Get clinic timings
    const { data: timing } = await supabase
      .from('clinic_timings')
      .select('*')
      .eq('clinic_id', doctor.clinic_id)
      .eq('day_name', dayName)
      .maybeSingle()

    if (!timing || timing.is_closed) return []

    // Determine start/end bounds
    const startHourStr = doctor.available_start_time || timing.opening_time || '09:00'
    const endHourStr = doctor.available_end_time || timing.closing_time || '17:00'

    // Generate 30 minute intervals
    const slots: string[] = []
    let current = parse(startHourStr, 'HH:mm', new Date())
    const end = parse(endHourStr, 'HH:mm', new Date())

    while (current < end) {
      const slotStr = format(current, 'HH:mm')
      
      // Check lunch break
      const isLunch = timing.lunch_break_start && timing.lunch_break_end && 
        slotStr >= timing.lunch_break_start && slotStr < timing.lunch_break_end

      if (!isLunch) {
        slots.push(slotStr)
      }
      // Add 30 minutes
      current = new Date(current.getTime() + 30 * 60 * 1000)
    }

    // Filter out already booked appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', dateStr)
      .eq('status', 'scheduled')

    const bookedTimes = appointments?.map(a => a.appointment_time) || []
    return slots.filter(s => !bookedTimes.includes(s))
  } catch (err) {
    console.error('[getAvailableSlots] error:', err)
    return []
  }
}

/**
 * AI Healthcare booking assistant state machine.
 */
export async function runBookingFlow(
  supabase: SupabaseClient,
  orgId: string,
  conversationId: string,
  messageText: string,
  aiConfig: any
): Promise<string> {
  // Load conversation state
  const { data: conversation } = await supabase
    .from('conversations')
    .select('booking_stage, booking_state, contact_id')
    .eq('id', conversationId)
    .single()

  if (!conversation) return 'Error loading conversation.'

  const currentStage = conversation.booking_stage || 'init'
  const state: BookingState = typeof conversation.booking_state === 'object'
    ? conversation.booking_state
    : JSON.parse(conversation.booking_state || '{}')

  const { data: clinic } = await supabase
    .from('clinics')
    .select('id, clinic_name')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!clinic) {
    return 'Clinic profile is not configured yet. Please contact clinic admin.'
  }

  // Load doctors list
  const { data: doctors } = await supabase
    .from('doctors')
    .select('id, doctor_name, specialization')
    .eq('clinic_id', clinic.id)

  const docListStr = doctors?.map(d => `- ${d.doctor_name} (${d.specialization})`).join('\n') || 'None'

  let reply = ''
  
  if (currentStage === 'init') {
    reply = `Welcome to *${clinic.clinic_name}*! I am your AI assistant and I can help you book an appointment today.\n\nCould you please reply with the Patient Name, Age, and the main symptoms or Reason for your visit?`
    
    await supabase
      .from('conversations')
      .update({
        booking_stage: 'collect_patient_info',
        booking_state: JSON.stringify(state)
      })
      .eq('id', conversationId)

  } else if (currentStage === 'collect_patient_info') {
    // Call AI to parse details from the text
    const extractionPrompt = 
      `You are an details extractor. Analyze the customer text: "${messageText}".\n` +
      `Extract the patient name, age, and reason for visit. Output ONLY valid JSON in this format: ` +
      `{"name": "...", "age": "...", "reason": "..."}. If details are missing, put null.`

    let extractedData: any = { name: null, age: null, reason: null }
    try {
      const parsedText = await generateReply({
        config: aiConfig,
        systemPrompt: 'You extract details to JSON. No intro/outro.',
        messages: [{ role: 'user', content: extractionPrompt }]
      })
      extractedData = JSON.parse(parsedText.text)
    } catch {}

    state.patient_name = extractedData.name || messageText.split(',')[0]?.trim() || 'Patient'
    state.patient_age = extractedData.age || 'Unknown'
    state.reason_for_visit = extractedData.reason || messageText

    reply = `Thank you. Here are the specialist doctors available at our clinic:\n\n${docListStr}\n\nWhich doctor or specialist would you like to consult? Please reply with the doctor's name.`
    
    await supabase
      .from('conversations')
      .update({
        booking_stage: 'select_doctor',
        booking_state: JSON.stringify(state)
      })
      .eq('id', conversationId)

  } else if (currentStage === 'select_doctor') {
    // Find matching doctor
    const selectedDoc = doctors?.find(d => 
      d.doctor_name.toLowerCase().includes(messageText.toLowerCase()) ||
      messageText.toLowerCase().includes(d.doctor_name.toLowerCase())
    )

    if (!selectedDoc) {
      reply = `Sorry, I couldn't find a doctor named "${messageText}". Please choose from the list:\n\n${docListStr}`
    } else {
      state.doctor_id = selectedDoc.id
      state.doctor_name = selectedDoc.doctor_name

      reply = `Great! You've selected *${selectedDoc.doctor_name}*. What date would you like to visit? You can say "tomorrow", "day after tomorrow", or specify a date (e.g. YYYY-MM-DD).`
      
      await supabase
        .from('conversations')
        .update({
          booking_stage: 'select_time',
          booking_state: JSON.stringify(state)
        })
        .eq('id', conversationId)
    }

  } else if (currentStage === 'select_time') {
    // Interpret date
    let dateStr = ''
    const normText = messageText.toLowerCase()
    if (normText.includes('today')) {
      dateStr = format(new Date(), 'yyyy-MM-dd')
    } else if (normText.includes('tomorrow')) {
      dateStr = format(addDays(new Date(), 1), 'yyyy-MM-dd')
    } else if (normText.includes('day after')) {
      dateStr = format(addDays(new Date(), 2), 'yyyy-MM-dd')
    } else {
      // Simple regex parse YYYY-MM-DD
      const match = messageText.match(/\d{4}-\d{2}-\d{2}/)
      dateStr = match ? match[0] : format(addDays(new Date(), 1), 'yyyy-MM-dd')
    }

    state.appointment_date = dateStr
    const slots = await getAvailableSlots(supabase, state.doctor_id!, dateStr)

    if (slots.length === 0) {
      reply = `I am sorry, there are no open slots available for *${state.doctor_name}* on ${dateStr}. Could you suggest another date?`
    } else {
      reply = `Here are the available slots on *${dateStr}*:\n\n` +
        slots.map((s, idx) => `${idx + 1}. ${s}`).join('\n') +
        `\n\nPlease reply with the slot number or time (e.g. "1" or "09:30") to confirm.`

      await supabase
        .from('conversations')
        .update({
          booking_stage: 'confirm_slot',
          booking_state: JSON.stringify(state)
        })
        .eq('id', conversationId)
    }

  } else if (currentStage === 'confirm_slot') {
    const slots = await getAvailableSlots(supabase, state.doctor_id!, state.appointment_date!)
    let selectedSlot = ''

    // Check if user input is slot index number
    const index = parseInt(messageText, 10)
    if (!isNaN(index) && index > 0 && index <= slots.length) {
      selectedSlot = slots[index - 1]
    } else {
      // Find matching time
      selectedSlot = slots.find(s => s === messageText || messageText.includes(s)) || ''
    }

    if (!selectedSlot) {
      reply = `Invalid selection. Please reply with the slot number:\n\n` +
        slots.map((s, idx) => `${idx + 1}. ${s}`).join('\n')
    } else {
      state.appointment_time = selectedSlot

      // Create appointment
      const { error: apptErr } = await supabase
        .from('appointments')
        .insert({
          organization_id: orgId,
          clinic_id: clinic.id,
          contact_id: conversation.contact_id,
          doctor_id: state.doctor_id,
          appointment_date: state.appointment_date,
          appointment_time: state.appointment_time,
          patient_name: state.patient_name,
          patient_age: state.patient_age,
          reason_for_visit: state.reason_for_visit,
          status: 'scheduled'
        })

      if (apptErr) {
        reply = `I encountered an issue confirming your slot: ${apptErr.message}. Let's try selecting the slot again.`
      } else {
        reply = `🎉 Awesome! Your appointment with *${state.doctor_name}* is confirmed!\n\n` +
          `📅 Date: ${state.appointment_date}\n` +
          `⏰ Time: ${state.appointment_time}\n` +
          `👤 Patient: ${state.patient_name}\n\n` +
          `See you at the clinic. Have a great day!`

        // Reset stage
        await supabase
          .from('conversations')
          .update({
            booking_stage: null,
            booking_state: null
          })
          .eq('id', conversationId)

        // Trigger Google Sheets sync if webhook URL exists
        const { data: orgConfig } = await supabase
          .from('organizations')
          .select('id') // normally settings JSON has sheetsWebhookUrl
          .eq('id', orgId)
          .maybeSingle()
      }
    }
  }

  return reply
}
