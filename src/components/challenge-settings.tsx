"use client";
import { useState, type FormEvent } from "react";
import { send, type Challenge } from "./api";
import { ErrorNotice, Field } from "./shared";

export function ChallengeSettings({
  challenge,
  reload,
}: {
  challenge: Challenge;
  reload: () => void;
}) {
  const [points, setPoints] = useState(challenge.points);
  const [fontFamily, setFontFamily] = useState(challenge.fontFamily);
  const [fontSize, setFontSize] = useState(challenge.fontSize);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await send(
        "challenges/" + challenge.id + "/settings",
        { points, fontFamily, fontSize },
        "PATCH",
      );
      setSaved(true);
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel" onSubmit={save}>
      <h2>Challenge settings</h2>
      <p>
        Change the reward for new participants and the font used on this
        challenge. Existing submissions keep their original reward, including
        revisions.
      </p>
      <fieldset disabled={busy} className="settings-fields">
        <Field
          name="edit-points"
          label="Challenge points"
          help="Whole numbers from 1 to 1,000."
        >
          <input
            id="edit-points"
            type="number"
            min={1}
            max={1000}
            step={1}
            required
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            aria-describedby="edit-points-help"
          />
        </Field>
        <Field name="challenge-font" label="Challenge font">
          <select
            id="challenge-font"
            value={fontFamily}
            onChange={(e) =>
              setFontFamily(e.target.value as Challenge["fontFamily"])
            }
          >
            <option value="default">Zyvara default</option>
            <option value="sans">Sans serif</option>
            <option value="serif">Serif</option>
          </select>
        </Field>
        <Field name="challenge-font-size" label="Challenge text size">
          <select
            id="challenge-font-size"
            value={fontSize}
            onChange={(e) =>
              setFontSize(e.target.value as Challenge["fontSize"])
            }
          >
            <option value="small">Small</option>
            <option value="default">Default</option>
            <option value="large">Large</option>
          </select>
        </Field>
        <button className="btn" type="submit">
          {busy ? "Saving…" : "Save challenge settings"}
        </button>
      </fieldset>
      {error && <ErrorNotice message={error} />}
      {saved && <p role="status">Challenge settings saved.</p>}
    </form>
  );
}
