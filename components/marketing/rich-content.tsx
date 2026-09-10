import { richContentToHtml } from "@/lib/rich-content";

export function RichContent({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={`rich-content ${className}`}
      dangerouslySetInnerHTML={{ __html: richContentToHtml(content) }}
    />
  );
}