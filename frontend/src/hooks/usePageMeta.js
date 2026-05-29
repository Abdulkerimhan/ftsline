import { useEffect } from "react";

export default function usePageMeta(title) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);
}