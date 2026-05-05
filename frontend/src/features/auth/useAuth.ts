import { useQuery } from "@tanstack/react-query";
import { fetchMe, type AuthEnvelope } from "./api";

export const ME_QUERY_KEY = ["me"] as const;

export function useAuth() {
  const { data, isLoading, error, isFetched } = useQuery<AuthEnvelope, Error>({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    retry: false,
    staleTime: Infinity,
  });
  return {
    user: data?.user,
    tenant: data?.tenant,
    isLoading,
    isFetched,
    error,
  };
}
