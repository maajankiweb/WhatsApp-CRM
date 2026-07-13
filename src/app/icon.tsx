import { ImageResponse } from "next/og";

// Dynamic Brand Icon matching favicon-32x32 SVG style
export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d0f16",
          borderRadius: 8,
          border: "1.5px solid #1e293b",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6366f1"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9c0 1.48.36 2.87 1 4.1L3 21l4.9-1c1.24.64 2.62 1 4.1 1Z" />
          <circle cx="12" cy="12" r="2" fill="#10B981" />
          <path d="M8 12h0.01M16 12h0.01" strokeWidth="2.5" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
