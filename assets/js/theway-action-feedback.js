(function (window) {
    "use strict";

    const app = window.TheWay || (window.TheWay = {});
    const core = app.core;
    if (!core) return;

    const feedbackTimers = new Map();

    function setBusy(button, message) {
        if (!button || button.dataset.twBusy === "1") return function () {};
        const original = button.innerHTML;
        button.dataset.twBusy = "1";
        button.dataset.twOriginal = original;
        button.classList.add("tw-action-disabled");
        button.disabled = true;
        if (message) button.textContent = message;
        return function restore() {
            button.disabled = false;
            button.classList.remove("tw-action-disabled");
            button.innerHTML = button.dataset.twOriginal || original;
            delete button.dataset.twBusy;
            delete button.dataset.twOriginal;
        };
    }

    function clearFeedbackTimer(button) {
        const timer = feedbackTimers.get(button);
        if (!timer) return;
        window.clearTimeout(timer);
        feedbackTimers.delete(button);
    }

    function clearAllFeedbackTimers() {
        feedbackTimers.forEach(function (timer) {
            window.clearTimeout(timer);
        });
        feedbackTimers.clear();
    }

    function runWithFeedback(button, loading, success, callback) {
        if (!button || button.dataset.twBusy === "1") return;
        clearFeedbackTimer(button);
        const restore = setBusy(button, loading || "Traitement...");

        const minimumDuration = new Promise(function (resolve) {
            const timer = window.setTimeout(function () {
                feedbackTimers.delete(button);
                resolve();
            }, 650);
            feedbackTimers.set(button, timer);
        });
        const work = Promise.resolve().then(function () {
            return callback ? callback() : null;
        });

        Promise.allSettled([work, minimumDuration]).then(function (results) {
            feedbackTimers.delete(button);
            if (button.isConnected) {
                restore();
                if (results[0].status === "rejected") {
                    const reason = results[0].reason;
                    core.showMessage("Action impossible. " + ((reason && reason.message) || ""));
                    return;
                }
                core.showMessage(success || "Demande prise en compte.");
            }
        });
    }

    function runAsyncAction(button, labels, task) {
        if (!button || button.dataset.twBusy === "1") return;
        clearFeedbackTimer(button);
        const restore = setBusy(button, labels.loading || "Traitement...");

        Promise.resolve()
            .then(task)
            .then(function () {
                if (button.isConnected) {
                    restore();
                    core.showMessage(labels.success || "Action enregistree.");
                }
            })
            .catch(function (error) {
                if (button.isConnected) {
                    restore();
                    core.showMessage((labels.error || "Action impossible.") + " " + (error.message || ""));
                }
            });
    }

    app.actionFeedback = {
        runWithFeedback: runWithFeedback,
        runAsyncAction: runAsyncAction,
        clearAllFeedbackTimers: clearAllFeedbackTimers
    };
})(window);
