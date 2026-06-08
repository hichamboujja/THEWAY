(function (window, document) {
    "use strict";

    const app = window.TheWay || (window.TheWay = {});
    const core = app.core;
    const ui = app.actionUI;
    const feedback = app.actionFeedback;
    const files = app.actionFiles;
    const navigation = app.actionNavigation;
    const api = app.api;
    if (!core || !ui || !feedback || !files || !navigation || !api) return;

    function openForgotPassword() {
        ui.openModal({
            title: "Recuperation du mot de passe",
            message: "Saisissez votre email pour recevoir un lien de confirmation.",
            input: true,
            placeholder: "email@exemple.com",
            confirmText: "Envoyer",
            onConfirm: function (email) {
                api.request("auth.passwordRecovery", { email: email })
                    .then(function () { core.showMessage("Lien de recuperation envoye."); })
                    .catch(function (error) { core.showMessage("Envoi impossible. " + (error.message || "")); });
            }
        });
    }

    function openLegalModal(context) {
        api.get("api/settings/public/legal")
            .then(function (result) {
                const data = result.data || result;
                ui.openModal({
                    title: context.label || "Information juridique",
                    message: data.content || "Les documents juridiques sont geres depuis les parametres administrateur.",
                    confirmText: "Fermer"
                });
            })
            .catch(function () {
                ui.openModal({
                    title: context.label || "Information juridique",
                    message: "Les documents juridiques sont geres depuis les parametres administrateur.",
                    confirmText: "Fermer"
                });
            });
    }

    function openPlansModal() {
        ui.openModal({
            title: "Plans THEWAY",
            message: "Envoyez une demande d'activation. Un administrateur gerera le plan, l'abonnement et la facture.",
            input: true,
            placeholder: "Plan souhaite ou message",
            confirmText: "Envoyer",
            onConfirm: function (message) {
                api.request("billing.upgradeRequest", { plan: "premium", message: message, page: location.pathname })
                    .then(function () { core.showMessage("Demande d'activation envoyee."); })
                    .catch(function (error) { core.showMessage("Demande impossible. " + (error.message || "")); });
            }
        });
    }

    function addOrCreate(context) {
        const title = context.label || "Ajouter";
        ui.openModal({
            title: title,
            message: "Renseignez un libelle pour creer l'element dans votre espace.",
            input: true,
            placeholder: "Libelle",
            confirmText: "Creer",
            onConfirm: function (value) {
                const name = value || "Nouvel element";
                api.request("draft.create", { name: name, page: location.pathname })
                    .then(function () {
                        core.showMessage(name + " cree.");
                    })
                    .catch(function (error) { core.showMessage("Creation impossible. " + (error.message || "")); });
            }
        });
    }

    function editOrConfigure(context) {
        ui.openModal({
            title: context.label || "Modifier",
            message: "Saisissez la nouvelle valeur a enregistrer.",
            input: true,
            placeholder: "Nouvelle valeur",
            confirmText: "Enregistrer",
            onConfirm: function () {
                api.request("entity.update", { label: context.label, page: location.pathname })
                    .then(function () { core.showMessage("Modification enregistree."); })
                    .catch(function (error) { core.showMessage("Modification impossible. " + (error.message || "")); });
            }
        });
    }

    function handlePagination(context) {
        const button = context.element;
        if (button.classList.contains("dots")) return;
        const group = button.parentElement;
        if (group) {
            group.querySelectorAll(".page-btn.active").forEach(function (item) {
                item.classList.remove("active");
            });
            if (/\d/.test(button.textContent)) button.classList.add("active");
        }
        core.showMessage("Page " + (button.textContent.trim() || "suivante") + " affichee.");
    }

    function handleFilter(context) {
        const button = context.element;
        const group = button.parentElement;
        if (group) {
            group.querySelectorAll(".filter-btn.active").forEach(function (item) {
                item.classList.remove("active");
            });
        }
        button.classList.add("active");
        core.showMessage("Filtre applique: " + (context.label || "selection"));
    }

    function runViewAction(context) {
        const route = navigation.routeForView(context.element);
        if (route) {
            core.goTo(route);
            return;
        }
        core.showMessage((context.label || "Details") + " ouvert.");
    }

    function runProcessAction(context) {
        const messages = {
            loading: "Preparation...",
            success: "Demande traitee."
        };
        if (context.element.matches(".refresh-btn")) {
            messages.loading = "Actualisation...";
            messages.success = "Donnees actualisees.";
        } else if (context.element.matches(".continue-btn")) {
            messages.loading = "Ouverture...";
            messages.success = "Progression mise a jour.";
        } else if (context.element.matches(".btn-validate")) {
            messages.loading = "Validation...";
            messages.success = "Demande de validation enregistree.";
        }
        feedback.runAsyncAction(context.element, {
            loading: messages.loading,
            success: messages.success,
            error: "Traitement impossible."
        }, function () {
            return api.request("process.run", { action: context.action, label: context.label, page: location.pathname });
        });
    }

    function toggleBookmark(context) {
        const isSaved = context.element.classList.toggle("saved");
        context.element.setAttribute("aria-pressed", isSaved ? "true" : "false");
        api.request("opportunity.bookmark", { saved: isSaved, page: location.pathname })
            .then(function () { core.showMessage(isSaved ? "Opportunite enregistree." : "Opportunite retiree."); })
            .catch(function (error) { core.showMessage("Favori impossible. " + (error.message || "")); });
    }

    function confirmApiAction(context, message, apiAction, success) {
        ui.openModal({
            title: "Confirmation",
            message: message,
            confirmText: "Confirmer",
            danger: true,
            onConfirm: function () {
                feedback.runAsyncAction(context.element, {
                    loading: "Traitement...",
                    success: success,
                    error: "Action impossible."
                }, function () {
                    return api.request(apiAction, { label: context.label, page: location.pathname }).then(function () {
                        const row = context.element.closest("tr");
                        if (row) row.style.opacity = ".55";
                    });
                });
            }
        });
    }

    const handlers = {
        "forgot-password": openForgotPassword,
        "social-login": function (context) {
            const provider = core.normalize(context.element.id || context.label || "social").replace("btn", "") || "social";
            ui.openModal({
                title: "Connexion " + provider,
            message: "Vous allez etre redirige vers le fournisseur OAuth configure.",
            confirmText: "Continuer",
            onConfirm: function () {
                window.location.assign(api.baseURL() + "/api/auth/oauth/" + encodeURIComponent(provider) + "/start");
            }
        });
        },
        legal: openLegalModal,
        pagination: handlePagination,
        filter: handleFilter,
        copy: files.copyPageValue,
        plans: openPlansModal,
        "context-menu": function (context) {
            ui.openPopover(context.element);
        },
        upload: function (context) {
            files.uploadFor(context.element);
        },
        download: function (context) {
            feedback.runAsyncAction(context.element, {
                loading: "Preparation...",
                success: "Telechargement prepare.",
                error: "Export impossible."
            }, function () {
                return api.download("file.export", {
                    kind: context.element.dataset.twDownload || context.element.dataset.twTarget || "export",
                    page: location.pathname
                }).then(function (result) {
                    files.downloadBlob(result.blob, result.filename);
                });
            });
        },
        destructive: function (context) {
            confirmApiAction(context, context.label + " ?", "entity.delete", "Action appliquee.");
        },
        "disconnect-integration": function (context) {
            confirmApiAction(context, "Deconnecter cette integration ?", "integration.disconnect", "Integration deconnectee.");
        },
        create: addOrCreate,
        edit: editOrConfigure,
        connect: function (context) {
            feedback.runAsyncAction(context.element, {
                loading: "Connexion...",
                success: "Integration connectee.",
                error: "Connexion impossible."
            }, function () {
                return api.request("integration.connect", { label: context.label, page: location.pathname });
            });
        },
        "integration-action": function (context) {
            feedback.runAsyncAction(context.element, {
                loading: "Mise a jour...",
                success: "Integration mise a jour.",
                error: "Mise a jour impossible."
            }, function () {
                return api.request("integration.update", { label: context.label, page: location.pathname });
            });
        },
        process: runProcessAction,
        view: runViewAction,
        bookmark: toggleBookmark,
        logout: navigation.logoutUser
    };

    app.actionHandlers = {
        get: function (action) {
            return handlers[action] || null;
        }
    };
})(window, document);
