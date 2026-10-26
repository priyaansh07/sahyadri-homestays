# Sahyadri Homestays – Booking & Feedback Assistant

College prototype (CIA 3 · Group 8 · Low-Code Tools) for a fictional 12-room homestay in Lonavala.
React + TypeScript + Tailwind, runs fully in the browser. All data is saved in the browser's localStorage, with no backend and no login. **All guest data is fictional.**

**Live demo:** https://priyaansh07.github.io/sahyadri-homestays/ (opens in any browser; each visitor gets their own copy of the demo data)

## Run it

```bash
npm install
npm run dev        # open the printed http://localhost:5173 link
npm run build      # optional: static build in dist/ (open with `npm run preview`)
```

Optional: click **⚙ Settings** and paste a Gemini API key. It is stored only in this browser, and the screen shows only its last 4 characters. Without a key, everything still works and the AI step goes to the fail-safe ("NEEDS HUMAN REVIEW").

## What does what

| Step | Done by | Where |
|---|---|---|
| Booking rules (missing data, invalid dates, double-booking) | Code | `src/booking.ts` |
| Mask e-mail / Indian phone / guest's name before AI | Code | `src/mask.ts` |
| Sentiment classification (temperature 0, fixed system prompt) | Gemini 2.5 Flash | `src/gemini.ts` |
| Guardrail on AI answer (invalid JSON, "positive" with complaint, rating 1–2) | Code | `src/guardrail.ts` |
| Retry ×3 then fail-safe → NEEDS HUMAN REVIEW | Code | `src/gemini.ts`, `src/feedback.ts` |
| Public reply | Owner only (Approve & send) | Owner Dashboard |
| Audit trail + 180-day contact purge | Code | Log tab |

## 2-minute demo script

1. **Owner Dashboard**: shows the KPIs, the 3 seeded bookings, the room calendar, the alerts inbox and Kavya's mixed comment.
2. **Test Lab → Run all tests**: shows a table with Expected / Actual / Pass-Fail for T1–T7.
   *T4 needs a Gemini key to pass. Without one it correctly falls back to NEEDS HUMAN REVIEW, but that differs from the expected "neutral (mixed)", so it is shown as FAIL.*
3. Click **T4 RED-TEAM** on its own to watch the pipeline tick through each step: masking, Gemini, guardrail, then the owner alert.
4. Back on the **Dashboard**, type a reply and click **Approve & send (Y)**. Only then does a "sent e-mail" card appear.
5. **Log**: filter by Booking ID to show every step that was recorded.
6. **Reset demo data** (Test Lab) restores the starting state.

## Seed data

- Bookings: Kavya Menon R7, 20–22 Oct 2026 (checked out); Asha Rao R3, 24–26 Oct 2026; Meera Kulkarni R5, 5–7 Nov 2026.
- Feedback: Kavya (rating 3, mixed, needs attention) and a positive 5★ comment from an earlier, archived stay. The positive one is logged only and not shown on the dashboard.
