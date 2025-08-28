"use client";

import { useState } from "react";
import type { Note } from "@/hooks/useLocalNotes";

export type NotesSectionProps = Readonly<{
  notes: Note[];
  onAdd: (content: string) => void;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}>;

export function NotesSection({ notes, onAdd, onUpdate, onDelete }: NotesSectionProps) {
  const [newNote, setNewNote] = useState("");
  return (
    <div className="mt-2 border rounded p-2">
      <div className="text-sm font-semibold mb-2">Notes</div>
      <div className="flex gap-2 mb-2">
        <input
          className="flex-1 border rounded px-2 py-1 bg-transparent"
          placeholder="Add a note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
        />
        <button
          className="px-2 py-1 border rounded"
          onClick={() => {
            if (!newNote.trim()) return;
            onAdd(newNote.trim());
            setNewNote("");
          }}
        >
          Save
        </button>
      </div>
      {notes.length === 0 ? (
        <div className="text-xs opacity-70">No notes yet.</div>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="text-sm border rounded p-2">
              <div className="opacity-70 text-xs mb-1">{new Date(n.updatedAt).toLocaleString()}</div>
              <textarea
                className="w-full bg-transparent border rounded p-1 text-sm"
                value={n.content}
                onChange={(e) => onUpdate(n.id, e.target.value)}
              />
              <div className="flex justify-end mt-1">
                <button className="text-xs opacity-70 hover:opacity-100" onClick={() => onDelete(n.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
