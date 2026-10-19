import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "var(--bg, #000)",
        color: "var(--fg-0, #ededed)",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div>
        <p style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3, #8a8a8a)" }}>
          404 · Lost in space
        </p>
        <h1 style={{ fontSize: 40, fontWeight: 500, letterSpacing: "-0.04em", margin: "12px 0 20px" }}>
          That world isn&apos;t on our map.
        </h1>
        <Link href="/explore" className="g-btn g-btn-solid" style={{ display: "inline-flex" }}>
          Back to the solar system
        </Link>
      </div>
    </main>
  );
}
