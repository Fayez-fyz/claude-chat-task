import { isServer, QueryClient } from "@tanstack/react-query";



function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
      },
      mutations: {
        retry: 1,
      },
    },
  });
}


let browserQueryClient: QueryClient | undefined = undefined;
export function getQueryClient() {
    if(isServer) {
        return makeQueryClient();
    } else {
    if(!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
    }
}