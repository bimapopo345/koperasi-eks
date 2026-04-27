import { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const toolbar = [
  ["bold", "italic", "underline"],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ align: [] }],
  ["link"],
  ["clean"],
];

export default function RichTextEditor({ value, onChange, placeholder = "" }) {
  const hostRef = useRef(null);
  const quillRef = useRef(null);
  const latestValueRef = useRef(value || "");

  useEffect(() => {
    latestValueRef.current = value || "";
    if (!quillRef.current) return;

    const currentHtml = quillRef.current.root.innerHTML;
    if (currentHtml !== latestValueRef.current) {
      const selection = quillRef.current.getSelection();
      quillRef.current.root.innerHTML = latestValueRef.current;
      if (selection) quillRef.current.setSelection(selection);
    }
  }, [value]);

  useEffect(() => {
    if (!hostRef.current || quillRef.current) return;

    const quill = new Quill(hostRef.current, {
      theme: "snow",
      placeholder,
      modules: { toolbar },
    });

    quill.root.innerHTML = latestValueRef.current;
    quill.on("text-change", () => {
      const html = quill.root.innerHTML;
      latestValueRef.current = html;
      onChange(html === "<p><br></p>" ? "" : html);
    });
    quillRef.current = quill;
  }, [onChange, placeholder]);

  return <div className="inv-quill" ref={hostRef} />;
}
