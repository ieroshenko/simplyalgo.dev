import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResumeStep } from "../ResumeStep";
import type { InterviewState } from "../../../types/mockInterviewTypes";

// Mock the ResumeUpload component
vi.mock("../../ResumeUpload", () => ({
    default: ({ onResumeExtracted }: { onResumeExtracted: (text: string) => void }) => (
        <button onClick={() => onResumeExtracted("Mock resume text")}>
            Upload Resume
        </button>
    ),
}));

describe("ResumeStep", () => {
    const mockSetState = vi.fn();
    const mockOnNext = vi.fn();

    const defaultState: InterviewState = {
        step: "resume",
        resumeText: "",
        role: "",
        company: "",
        questions: [],
        currentQuestionIndex: 0,
        answers: {},
        feedbacks: {},
        mockInterviewId: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Clear localStorage
        localStorage.clear();
    });

    it("should render resume upload step", () => {
        render(
            <ResumeStep state={defaultState} setState={mockSetState} onNext={mockOnNext} />
        );

        expect(screen.getByText("Step 1: Upload Your Resume")).toBeInTheDocument();
        expect(
            screen.getByText(/Upload your resume so we can generate personalized interview questions/)
        ).toBeInTheDocument();
    });

    it("should disable continue button when no resume text", () => {
        render(
            <ResumeStep state={defaultState} setState={mockSetState} onNext={mockOnNext} />
        );

        const continueButton = screen.getByRole("button", { name: /continue/i });
        expect(continueButton).toBeDisabled();
    });

    it("should enable continue button when resume text exists", () => {
        const stateWithResume = { ...defaultState, resumeText: "Test resume" };
        render(
            <ResumeStep state={stateWithResume} setState={mockSetState} onNext={mockOnNext} />
        );

        const continueButton = screen.getByRole("button", { name: /continue/i });
        expect(continueButton).toBeEnabled();
    });

    it("should call setState when resume is extracted", () => {
        render(
            <ResumeStep state={defaultState} setState={mockSetState} onNext={mockOnNext} />
        );

        const uploadButton = screen.getByText("Upload Resume");
        fireEvent.click(uploadButton);

        // Verify setState was called with a function that updates resumeText
        expect(mockSetState).toHaveBeenCalled();
        const setStateCall = mockSetState.mock.calls[0][0];
        const newState = setStateCall(defaultState);
        expect(newState.resumeText).toBe("Mock resume text");
    });

    it("should call onNext when continue is clicked with valid resume", () => {
        const stateWithResume = { ...defaultState, resumeText: "Test resume" };
        render(
            <ResumeStep state={stateWithResume} setState={mockSetState} onNext={mockOnNext} />
        );

        const continueButton = screen.getByRole("button", { name: /continue/i });
        fireEvent.click(continueButton);

        expect(mockOnNext).toHaveBeenCalled();
    });

    it("should not call onNext when continue is clicked without resume", () => {
        render(
            <ResumeStep state={defaultState} setState={mockSetState} onNext={mockOnNext} />
        );

        const continueButton = screen.getByRole("button", { name: /continue/i });
        fireEvent.click(continueButton);

        expect(mockOnNext).not.toHaveBeenCalled();
    });

    it("should show success message when resume is loaded from previous session", () => {
        const stateWithResume = { ...defaultState, resumeText: "Previous resume" };
        render(
            <ResumeStep state={stateWithResume} setState={mockSetState} onNext={mockOnNext} />
        );

        expect(
            screen.getByText(/Resume loaded from previous session/)
        ).toBeInTheDocument();
    });
});
