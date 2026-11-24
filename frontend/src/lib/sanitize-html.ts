// Lọc HTML của template đề (bảng, chữ đậm...) trước khi đưa vào dangerouslySetInnerHTML.
// Nội dung đề đến từ Admin và từ dataset nạp vào: nếu lọt <img onerror=...> hay <script> thì mã chạy trong
// phiên của Learner và đọc được token trong localStorage (stored XSS). Chỉ giữ thẻ và thuộc tính cần để hiển thị.
//
// Dùng DOMPurify thay bộ lọc tự viết: nó parse trong document trơ (không tải ảnh, không chạy handler) và đã
// được kiểm thử với các kiểu mutation XSS (HTML đổi nghĩa khi bị parse lại), thứ bộ lọc tự viết dễ sót.
// Lớp chặn thứ hai là CSP có nonce trong src/proxy.ts: script lọt qua đây vẫn không được trình duyệt chạy.
import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "b", "strong", "i", "em", "u", "s", "br", "p", "span", "div", "sup", "sub", "small",
  "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup", "col",
];
const ALLOWED_ATTR = ["style", "colspan", "rowspan", "class", "align"];
// style chỉ để căn lề, độ rộng, màu: chặn url(), expression() và các cách nạp tài nguyên ngoài
const UNSAFE_STYLE = /url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:|image-set\s*\(/i;

let styleHookInstalled = false;

function installStyleHook() {
  if (styleHookInstalled) return;
  DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
    if (data.attrName === "style" && UNSAFE_STYLE.test(data.attrValue)) data.keepAttr = false;
  });
  styleHookInstalled = true;
}

function stripAllTags(html: string): string {
  const text = html.replace(/<[^>]*>/g, "");
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  // Render phía server (không có DOM) hoặc trình duyệt quá cũ: DOMPurify sẽ trả nguyên văn, nên chỉ giữ chữ
  if (typeof window === "undefined" || !DOMPurify.isSupported) return stripAllTags(html);
  installStyleHook();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
}
