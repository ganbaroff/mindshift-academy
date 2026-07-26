"use client";

import { useEffect } from "react";

const PASSWORD_LABELS: Record<string, string> = {
  "Show password": "Показать пароль",
  "Hide password": "Скрыть пароль",
};

function localizeClerkUi(root: ParentNode) {
  root
    .querySelectorAll<HTMLInputElement>('input[placeholder="Create a password"]')
    .forEach((input) => input.setAttribute("placeholder", "Придумайте пароль"));

  root
    .querySelectorAll<HTMLButtonElement>(".cl-formFieldInputShowPasswordButton")
    .forEach((button) => {
      const label = button.getAttribute("aria-label");
      if (label && PASSWORD_LABELS[label]) {
        button.setAttribute("aria-label", PASSWORD_LABELS[label]);
      }
    });

  root
    .querySelectorAll<HTMLAnchorElement>(
      'a[aria-label="Clerk logo"], a[aria-label="Логотип Clerk"]',
    )
    .forEach((link) => {
      if (link.getAttribute("aria-label") !== "Логотип Clerk") {
        link.setAttribute("aria-label", "Логотип Clerk");
      }
      const securedBy = link.parentElement?.querySelector("p");
      if (securedBy?.textContent === "Secured by") {
        securedBy.textContent = "Защищено с помощью";
      }
    });
}

/**
 * Clerk's experimental ru-RU catalog currently leaves a few component-owned
 * accessibility strings in English. Keep this adapter narrow so it can be
 * removed as soon as Clerk ships those translations upstream.
 */
export function ClerkRussianUi() {
  useEffect(() => {
    localizeClerkUi(document);

    const observer = new MutationObserver(() => localizeClerkUi(document));
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-label", "placeholder"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
