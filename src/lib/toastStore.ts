type ToastAPI = {
  show: (msg: string) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
};

export function useToast(): ToastAPI {
  return {
    show: (msg: string) => console.log("[toast]", msg),
    success: (msg: string) => console.log("[toast:ok]", msg),
    error: (msg: string) => console.error("[toast:err]", msg),
  };
}
