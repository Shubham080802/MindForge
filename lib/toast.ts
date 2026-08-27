export function showToast(message: string, type: "success" | "error" | "info" = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.setAttribute("role", "alert");
  toast.innerHTML = `
    <span class="toast-content">${message}</span>
    <button class="toast-close" aria-label="Dismiss">&times;</button>
  `;

  toast.querySelector(".toast-close")?.addEventListener("click", () => toast.remove());
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 5000);
}
