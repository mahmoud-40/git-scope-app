"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type NoteTargetType = "user" | "repo";

export type Note = {
  id: string;
  targetType: NoteTargetType;
  targetKey: string; 
  content: string;
  createdAt: number;
  updatedAt: number;
};

type NotesState = Record<string, Note>; 

const STORAGE_KEY = "git-scope-notes";

function readFromStorage(): NotesState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as NotesState;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function writeToStorage(state: NotesState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useLocalNotes() {
  const [notesById, setNotesById] = useState<NotesState>({});

  useEffect(() => {
    setNotesById(readFromStorage());
  }, []);

  useEffect(() => {
    writeToStorage(notesById);
  }, [notesById]);

  const allNotes = useMemo(() => Object.values(notesById).sort((a, b) => b.updatedAt - a.updatedAt), [notesById]);

  const getNotesFor = useCallback(
    (targetType: NoteTargetType, targetKey: string) =>
      allNotes.filter((n) => n.targetType === targetType && n.targetKey === targetKey),
    [allNotes]
  );

  const addNote = useCallback((targetType: NoteTargetType, targetKey: string, content: string) => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const note: Note = { id, targetType, targetKey, content, createdAt: now, updatedAt: now };
    setNotesById((prev) => ({ ...prev, [id]: note }));
  }, []);

  const updateNote = useCallback((id: string, content: string) => {
    setNotesById((prev) => {
      const current = prev[id];
      if (!current) return prev;
      const updated: Note = { ...current, content, updatedAt: Date.now() };
      return { ...prev, [id]: updated };
    });
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotesById((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, []);

  return { allNotes, getNotesFor, addNote, updateNote, deleteNote };
}



