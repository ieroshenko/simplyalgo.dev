import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DetailsStep } from "../DetailsStep";
import type { InterviewState } from "../../../types/mockInterviewTypes";

describe("DetailsStep", () => {
    const mockSetState = vi.fn();
    const mockOnStartInterview = vi.fn();

    const defaultState: InterviewState = {
        step: "details",
        resumeText: "Test resume",
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
    });

    it("should render details step", () => {
        render(
            <DetailsStep
                state={defaultState}
                setState={mockSetState}
                onStartInterview={mockOnStartInterview}
                isGeneratingQuestions={false}
            />
        );

        expect(screen.getByText("Step 2: Interview Details")).toBeInTheDocument();
        expect(
            screen.getByText(/Tell us about the role and company you're interviewing with/)
        ).toBeInTheDocument();
    });

    it("should render role and company input fields", () => {
        render(
            <DetailsStep
                state={defaultState}
                setState={mockSetState}
                onStartInterview={mockOnStartInterview}
                isGeneratingQuestions={false}
            />
        );

        expect(screen.getByLabelText(/Role \*/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Company \(Optional\)/)).toBeInTheDocument();
    });

    it("should update state when role is changed", () => {
        render(
            <DetailsStep
                state={defaultState}
                setState={mockSetState}
                onStartInterview={mockOnStartInterview}
                isGeneratingQuestions={false}
            />
        );

        const roleInput = screen.getByLabelText(/Role \*/);
        fireEvent.change(roleInput, { target: { value: "Senior Software Engineer" } });

        expect(mockSetState).toHaveBeenCalled();
    });

    it("should update state when company is changed", () => {
        render(
            <DetailsStep
                state={defaultState}
                setState={mockSetState}
                onStartInterview={mockOnStartInterview}
                isGeneratingQuestions={false}
            />
        );

        const companyInput = screen.getByLabelText(/Company \(Optional\)/);
        fireEvent.change(companyInput, { target: { value: "Google" } });

        expect(mockSetState).toHaveBeenCalled();
    });

    it("should disable start button when role is empty", () => {
        render(
            <DetailsStep
                state={defaultState}
                setState={mockSetState}
                onStartInterview={mockOnStartInterview}
                isGeneratingQuestions={false}
            />
        );

        const startButton = screen.getByRole("button", { name: /Start Interview/ });
        expect(startButton).toBeDisabled();
    });

    it("should enable start button when role is provided", () => {
        const stateWithRole = { ...defaultState, role: "Software Engineer" };
        render(
            <DetailsStep
                state={stateWithRole}
                setState={mockSetState}
                onStartInterview={mockOnStartInterview}
                isGeneratingQuestions={false}
            />
        );

        const startButton = screen.getByRole("button", { name: /Start Interview/ });
        expect(startButton).toBeEnabled();
    });

    it("should disable start button when generating questions", () => {
        const stateWithRole = { ...defaultState, role: "Software Engineer" };
        render(
            <DetailsStep
                state={stateWithRole}
                setState={mockSetState}
                onStartInterview={mockOnStartInterview}
                isGeneratingQuestions={true}
            />
        );

        const startButton = screen.getByRole("button");
        expect(startButton).toBeDisabled();
        expect(screen.getByText(/Generating Questions.../)).toBeInTheDocument();
    });

    it("should call onStartInterview when start button is clicked", () => {
        const stateWithRole = { ...defaultState, role: "Product Manager" };
        render(
            <DetailsStep
                state={stateWithRole}
                setState={mockSetState}
                onStartInterview={mockOnStartInterview}
                isGeneratingQuestions={false}
            />
        );

        const startButton = screen.getByRole("button", { name: /Start Interview/ });
        fireEvent.click(startButton);

        expect(mockOnStartInterview).toHaveBeenCalled();
    });

    it("should show loading state while generating questions", () => {
        const stateWithRole = { ...defaultState, role: "Data Scientist" };
        render(
            <DetailsStep
                state={stateWithRole}
                setState={mockSetState}
                onStartInterview={mockOnStartInterview}
                isGeneratingQuestions={true}
            />
        );

        expect(screen.getByText(/Generating Questions.../)).toBeInTheDocument();
    });

    it("should display helper text for company field", () => {
        render(
            <DetailsStep
                state={defaultState}
                setState={mockSetState}
                onStartInterview={mockOnStartInterview}
                isGeneratingQuestions={false}
            />
        );

        expect(
            screen.getByText(/You can enter a specific company name or describe the type of company/)
        ).toBeInTheDocument();
    });
});
