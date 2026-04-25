"use client";
import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

const inputStyle = {
  width: "100%",
  height: 44,
  padding: "0 16px",
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r)",
  color: "var(--text-900)",
  fontSize: "var(--text-base)",
  fontFamily: "'DM Sans', sans-serif",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 150ms",
};

const labelStyle = {
  display: "block",
  fontSize: "var(--text-md)",
  fontWeight: 600,
  color: "var(--text-900)",
  marginBottom: 8,
  fontFamily: "'DM Sans', sans-serif",
};

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSuccess(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setError("Something went wrong. Please try again or email us directly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: "var(--s8) var(--s5)",
        fontFamily: "'DM Sans', sans-serif",
        background: "var(--bg)",
        minHeight: "100vh",
      }}
    >
      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: "var(--text-sm)",
          color: "var(--text-400)",
          textDecoration: "none",
          marginBottom: "var(--s5)",
        }}
      >
        ← Back to home
      </Link>

      <h1
        style={{
          fontFamily: "'Fraunces', serif",
          fontSize: "var(--text-xl)",
          fontWeight: 700,
          color: "var(--text-900)",
          marginBottom: "var(--s3)",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
        }}
      >
        Contact Us
      </h1>
      <p style={{ color: "var(--text-600)", fontSize: "var(--text-base)", marginBottom: "var(--s7)", lineHeight: 1.6 }}>
        Have a question, bug report, or feedback? Fill out the form below and we&apos;ll get back to you.
      </p>

      {success && (
        <div
          style={{
            background: "#F0FAF4",
            border: "1px solid #A8D8BB",
            borderLeft: "3px solid var(--state-live)",
            borderRadius: "var(--r)",
            padding: "var(--s4)",
            marginBottom: "var(--s6)",
            color: "var(--text-900)",
            fontSize: "var(--text-base)",
          }}
        >
          Message sent! We&apos;ll get back to you soon.
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#FDF2F2",
            border: "1px solid #F2BEBE",
            borderLeft: "3px solid var(--state-out)",
            borderRadius: "var(--r)",
            padding: "var(--s4)",
            marginBottom: "var(--s6)",
            color: "var(--text-900)",
            fontSize: "var(--text-base)",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--s5)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s4)" }}>
          <div>
            <label htmlFor="name" style={labelStyle}>Name</label>
            <input
              id="name"
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={set("name")}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set("email")}
              required
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label htmlFor="subject" style={labelStyle}>Subject</label>
          <input
            id="subject"
            type="text"
            placeholder="What's this about?"
            value={form.subject}
            onChange={set("subject")}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="message" style={labelStyle}>Message</label>
          <textarea
            id="message"
            placeholder="Tell us more…"
            value={form.message}
            onChange={set("message")}
            required
            rows={6}
            style={{
              ...inputStyle,
              height: "auto",
              padding: "12px 16px",
              resize: "vertical",
              lineHeight: 1.6,
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            height: 44,
            background: loading ? "var(--border-strong)" : "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--r)",
            fontSize: "var(--text-md)",
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 75ms",
          }}
        >
          {loading ? "Sending…" : "Send Message"}
        </button>
      </form>
    </main>
  );
}
