import { useState, useEffect } from "react";
import { UserAttemptsService, UserAttempt } from "@/services/userAttempts";

export const useSubmissions = (
  userId: string | undefined,
  problemId: string | undefined,
) => {
  const [submissions, setSubmissions] = useState<UserAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !problemId) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await UserAttemptsService.getAcceptedSubmissions(
          userId,
          problemId,
        );
        setSubmissions(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch submissions",
        );
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [userId, problemId]);

  const refetch = async () => {
    if (!userId || !problemId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await UserAttemptsService.getAcceptedSubmissions(
        userId,
        problemId,
      );
      setSubmissions(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch submissions",
      );
    } finally {
      setLoading(false);
    }
  };

  return { submissions, loading, error, refetch };
};
