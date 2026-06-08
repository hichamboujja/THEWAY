(function (window) {
    "use strict";

    const app = window.TheWay || (window.TheWay = {});
    const core = app.core;
    if (!core) return;

    function routeForTarget(target) {
        const routes = {
            progression: function () { return core.userPanelPath("progression.html"); },
            skills: function () { return core.userPanelPath("skills.html"); },
            opportunity: function () { return core.userPanelPath("opportunity.html"); },
            opportunityDetails: function () { return core.userPanelPath("opportunity-details.html"); },
            profile: function () { return core.context.isAdminArea ? core.adminPath("users.html") : core.userSettingsPath("profile.html"); },
            analysis: function () { return core.context.isAdminArea ? core.adminPath("analyse.html") : core.userPanelPath("matching.html"); },
            support: function () { return core.adminPath("support.html"); },
            offers: function () { return core.context.isAdminArea ? core.adminPath("offres.html") : core.userPanelPath("opportunity.html"); },
            cv: function () { return core.userPanelPath("cv_competences.html"); },
            activity: function () { return core.context.isAdminArea ? core.adminPath("admin-dashboard.html") : core.userPanelPath("dashboard.html"); },
            sessions: function () { return core.userSettingsPath("compte.html"); }
        };
        return routes[target] ? routes[target]() : null;
    }

    function routeForView(button) {
        if (button.dataset.twTarget) return routeForTarget(button.dataset.twTarget);
        if (button.matches(".view-plan-btn")) return routeForTarget("progression");
        if (button.matches(".btn-profile")) return routeForTarget("profile");
        if (button.matches(".btn-analyses, .btn-review, .btn-pending")) return routeForTarget("analysis");
        if (button.matches(".job-arrow, .btn-details, .see-more-btn")) return routeForTarget("opportunityDetails");
        if (button.matches(".view-all-btn, .view-all-link, .view-all")) return routeForTarget(core.context.isAdminArea ? "activity" : "progression");
        return null;
    }

    function logoutUser(context) {
        const ui = app.actionUI;
        const feedback = app.actionFeedback;
        if (!ui || !feedback) return;
        ui.openModal({
            title: "Deconnexion",
            message: "Voulez-vous fermer la session en cours ?",
            confirmText: "Se deconnecter",
            danger: true,
            onConfirm: function () {
                feedback.runWithFeedback(context.element, "Deconnexion...", "Session fermee.", function () {
                    window.sessionStorage.removeItem(core.CURRENT_USER_KEY);
                    core.goTo(core.authPath("login.html"));
                });
            }
        });
    }

    app.actionNavigation = {
        routeForTarget: routeForTarget,
        routeForView: routeForView,
        logoutUser: logoutUser
    };
})(window);
