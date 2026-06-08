(function (window, document) {
    "use strict";

    const app = window.TheWay || (window.TheWay = {});
    const core = app.core;
    const feedback = app.actionFeedback;
    if (!core || !feedback) return;

    const actionScript = document.currentScript;
    const actionStylesHref = actionScript && actionScript.src
        ? new URL("../css/theway-actions.css", actionScript.src).href
        : "assets/css/theway-actions.css";
    let modalElement = null;
    let popoverElement = null;
    let popoverCloseQueued = false;

    function ensureStylesheet() {
        if (document.getElementById("theway-action-styles")) return;
        const link = document.createElement("link");
        link.id = "theway-action-styles";
        link.rel = "stylesheet";
        link.href = actionStylesHref;
        document.head.appendChild(link);
    }

    function closeModal() {
        if (modalElement) {
            modalElement.remove();
            modalElement = null;
        }
    }

    function openModal(options) {
        closeModal();
        ensureStylesheet();

        modalElement = document.createElement("div");
        modalElement.className = "tw-action-modal-backdrop";

        const modal = document.createElement("div");
        modal.className = "tw-action-modal";
        const title = document.createElement("h3");
        title.textContent = options.title || "Action";
        const message = document.createElement("p");
        message.textContent = options.message || "";
        modal.append(title, message);

        let input = null;
        if (options.input) {
            input = document.createElement("input");
            input.type = "text";
            input.placeholder = options.placeholder || "Nom";
            input.value = options.value || "";
            modal.appendChild(input);
        }

        const actions = document.createElement("div");
        actions.className = "tw-action-modal-actions";
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.textContent = options.cancelText || "Annuler";
        const confirm = document.createElement("button");
        confirm.type = "button";
        confirm.className = options.danger ? "tw-danger" : "tw-primary";
        confirm.textContent = options.confirmText || "Confirmer";
        actions.append(cancel, confirm);
        modal.appendChild(actions);
        modalElement.appendChild(modal);
        document.body.appendChild(modalElement);

        cancel.addEventListener("click", closeModal);
        modalElement.addEventListener("click", function (event) {
            if (event.target === modalElement) closeModal();
        });
        confirm.addEventListener("click", function () {
            const value = input ? input.value.trim() : "";
            closeModal();
            if (options.onConfirm) options.onConfirm(value);
        });
        if (input) input.focus();
    }

    function closePopover() {
        popoverCloseQueued = false;
        document.removeEventListener("click", closePopover);
        if (popoverElement) {
            popoverElement.remove();
            popoverElement = null;
        }
    }

    function confirmDestructive(button, message, success) {
        openModal({
            title: "Confirmation",
            message: message,
            confirmText: "Confirmer",
            danger: true,
            onConfirm: function () {
                feedback.runWithFeedback(button, "Traitement...", success || "Action confirmee.", function () {
                    const row = button.closest("tr");
                    if (row) row.style.opacity = ".55";
                });
            }
        });
    }

    function openPopover(anchor) {
        closePopover();
        ensureStylesheet();

        const rect = anchor.getBoundingClientRect();
        popoverElement = document.createElement("div");
        popoverElement.className = "tw-popover";
        popoverElement.style.top = Math.min(rect.bottom + 6, window.innerHeight - 160) + "px";
        popoverElement.style.left = Math.min(rect.left, window.innerWidth - 180) + "px";

        [
            { label: "Voir", message: "Details ouverts." },
            { label: "Modifier", message: "Edition ouverte." },
            { label: "Supprimer", message: "Suppression confirmee.", destructive: true }
        ].forEach(function (item) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = item.label;
            button.addEventListener("click", function () {
                closePopover();
                if (item.destructive) {
                    confirmDestructive(anchor, "Supprimer cet element ?", item.message);
                    return;
                }
                core.showMessage(item.message);
            });
            popoverElement.appendChild(button);
        });

        document.body.appendChild(popoverElement);
        popoverCloseQueued = true;
        window.queueMicrotask(function () {
            if (!popoverElement || !popoverCloseQueued) return;
            document.addEventListener("click", closePopover, { once: true });
        });
    }

    app.actionUI = {
        ensureStylesheet: ensureStylesheet,
        openModal: openModal,
        closeModal: closeModal,
        openPopover: openPopover,
        closePopover: closePopover,
        confirmDestructive: confirmDestructive
    };
})(window, document);
