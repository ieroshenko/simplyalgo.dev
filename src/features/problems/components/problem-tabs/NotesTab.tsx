import Notes, { NotesHandle } from "@/components/Notes";
import React from "react";

interface NotesTabProps {
    problemId: string;
    notesRef: React.RefObject<NotesHandle>;
}

export const NotesTab = ({ problemId, notesRef }: NotesTabProps) => {
    return <Notes problemId={problemId} ref={notesRef} />;
};
