export function Logo() {
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true">
      <rect width="42" height="42" rx="13" fill="#245C42" />
      <path
        d="M12 13h18L13 29h17"
        fill="none"
        stroke="#DCEAA5"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function Sprout() {
  return (
    <svg className="feature-art" viewBox="0 0 430 260" aria-hidden="true">
      <g fill="none" stroke="#568165" strokeWidth="1.5">
        {[
          [190, 125],
          [160, 100],
          [130, 75],
          [100, 50],
        ].map(([rx, ry]) => (
          <ellipse key={rx} cx="220" cy="130" rx={rx} ry={ry} />
        ))}
      </g>
      <path
        d="M212 210V115"
        stroke="#DCEAA5"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M212 146C140 150 120 103 138 74C190 75 213 103 212 146Z"
        fill="#DCEAA5"
      />
      <path
        d="M213 116C215 60 262 38 302 54C300 100 258 126 213 116Z"
        fill="#9DBF92"
      />
      <circle cx="340" cy="196" r="32" fill="#DCEAA5" />
      <path
        d="m326 196 10 10 18-20"
        fill="none"
        stroke="#172E25"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function CategoryArt({ category }: { category: string }) {
  return (
    <svg viewBox="0 0 180 130" aria-hidden="true">
      {category === "Planting" ? (
        <>
          <path d="M88 107V46" stroke="#245C42" strokeWidth="4" />
          <path
            d="M88 75C46 76 43 48 48 32C82 32 89 54 88 75Z"
            fill="#245C42"
          />
          <path
            d="M88 55C88 26 120 20 132 29C130 53 111 61 88 55Z"
            fill="#568165"
          />
          <path
            d="M44 110Q90 83 141 110"
            fill="none"
            stroke="#245C42"
            strokeWidth="3"
          />
        </>
      ) : category === "Recycling" ? (
        <path
          d="m89 22 24 39h-18m18 0 10-17M142 87H97l9-17m-9 17 15 15M45 89l22-39 8 15m-8-15-20-1"
          fill="none"
          stroke="#245C42"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : category === "Conservation" ? (
        <>
          <path
            d="M90 20C90 20 52 66 52 88a38 38 0 0 0 76 0C128 66 90 20 90 20Z"
            fill="#DCEAA5"
            stroke="#245C42"
            strokeWidth="3"
          />
          <path
            d="M72 85c0 16 12 22 22 22"
            fill="none"
            stroke="#245C42"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <path
            d="M15 105Q80 45 165 100"
            fill="none"
            stroke="#245C42"
            strokeWidth="3"
          />
          <path
            d="M45 100V42m0 30Q15 64 25 43Q48 40 45 72m0-17Q70 53 78 29Q48 25 45 55"
            fill="#245C42"
            stroke="#245C42"
            strokeWidth="3"
          />
          <rect
            x="109"
            y="56"
            width="26"
            height="43"
            rx="4"
            fill="#F7F8F2"
            stroke="#245C42"
            strokeWidth="2"
          />
          <path d="M109 62h26" stroke="#245C42" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}
