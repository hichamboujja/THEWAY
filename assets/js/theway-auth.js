(function (window, document) {
    "use strict";

    const app = window.TheWay || (window.TheWay = {});
    const core = app.core;
    if (!core) return;

    let initialized = false;

    function storageValue(key) {
        return core.storageValue(key);
    }

    function apiBase() {
        return core.apiBase();
    }

    function request(path, payload) {
        return fetch(apiBase() + path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload || {})
        }).then(function (response) {
            return response.json().catch(function () {
                return {};
            }).then(function (data) {
                if (!response.ok || data.ok === false) {
                    throw new Error(data.error || data.message || "Erreur API " + response.status);
                }
                return data;
            });
        });
    }

    function writeStorage(key, value, remember) {
        const primary = remember ? localStorage : sessionStorage;
        const secondary = remember ? sessionStorage : localStorage;
        try {
            primary.setItem(key, value);
            secondary.removeItem(key);
        } catch (error) {
            sessionStorage.setItem(key, value);
        }
    }

    function removeStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {}
        try {
            sessionStorage.removeItem(key);
        } catch (error) {}
    }

    function normalizeUser(user) {
        const safeUser = user || {};
        const fullName = [safeUser.prenom, safeUser.nom].filter(Boolean).join(" ") || safeUser.fullName || safeUser.email || "Utilisateur THEWAY";
        return {
            id: safeUser.id || safeUser.id_user || null,
            fullName: fullName,
            email: safeUser.email || "",
            phone: safeUser.telephone || safeUser.phone || "",
            location: safeUser.localisation || safeUser.location || "",
            jobTitle: safeUser.jobTitle || "",
            role: safeUser.role || "Candidat"
        };
    }

    function persistAuth(data, remember) {
        const responseData = data.data || data || {};
        const user = normalizeUser(responseData.user || data.user || {});
        writeStorage("theway_user", JSON.stringify(user), remember);
        core.rememberSessionUser(user);
        return user;
    }

    function setToken(token, remember) {
        writeStorage("theway_token", token, Boolean(remember));
        writeStorage("theway_token_time", String(Date.now()), Boolean(remember));
    }

    function getToken() {
        return storageValue("theway_user") ? "session" : "";
    }

    function clearToken() {
        removeStorage("theway_token");
        removeStorage("theway_token_time");
    }

    function logout() {
        return request("/api/auth/logout", {}).catch(function () {
            return null;
        }).finally(function () {
            clearToken();
            removeStorage("theway_user");
            core.writeJSON(core.CURRENT_USER_KEY, null);
        });
    }

    function currentUser() {
        const raw = storageValue("theway_user");
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (error) {
            return null;
        }
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function showFieldError(inputId, errorId) {
        const input = document.getElementById(inputId);
        const error = document.getElementById(errorId);
        if (input) input.classList.add("error");
        if (error) error.classList.add("show");
    }

    function clearFieldErrors(form) {
        form.querySelectorAll(".form-input.error").forEach(function (input) {
            input.classList.remove("error");
        });
        form.querySelectorAll(".error-message.show").forEach(function (error) {
            error.classList.remove("show");
        });
    }

    function setSubmitBusy(form, busy) {
        const button = form.querySelector("#submitBtn, button[type='submit']");
        if (!button) return;
        button.disabled = busy;
        button.classList.toggle("loading", busy);
    }

    function rememberLogin() {
        const checkbox = document.getElementById("rememberCheckbox");
        if (!checkbox) return true;
        return checkbox.classList.contains("checked") || checkbox.getAttribute("aria-checked") === "true";
    }

    function splitFullName(fullName) {
        const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
        const prenom = parts.shift() || "";
        return {
            prenom: prenom,
            nom: parts.length ? parts.join(" ") : "Non renseigne"
        };
    }

    function showSuccess(message) {
        const overlay = document.getElementById("successOverlay");
        if (overlay) overlay.classList.add("show");
        core.showMessage(message);
    }

    function goToDashboard() {
        window.setTimeout(function () {
            core.goTo("../pannel/dashboard.html");
        }, 750);
    }

    function login(email, password, remember) {
        return request("/api/auth/login", {
            email: email,
            password: password
        }).then(function (data) {
            return persistAuth(data, remember);
        });
    }

    function register(nom, prenom, email, password, telephone, localisation, remember) {
        return request("/api/auth/register", {
            nom: nom,
            prenom: prenom,
            email: email,
            password: password,
            telephone: telephone || "",
            localisation: localisation || ""
        }).then(function (data) {
            return persistAuth(data, remember);
        });
    }

    function socialLogin(provider, idToken, remember) {
        window.location.assign(apiBase() + "/api/auth/oauth/" + encodeURIComponent(provider) + "/start");
        return Promise.resolve();
    }

    function recoverPassword(email) {
        return request("/api/auth/password-reset/request", { email: email });
    }

    function submitLogin(event, form) {
        event.preventDefault();
        event.stopImmediatePropagation();

        clearFieldErrors(form);
        const email = (form.querySelector("#email") || {}).value || "";
        const password = (form.querySelector("#password") || {}).value || "";
        let valid = true;

        if (!validateEmail(email.trim())) {
            showFieldError("email", "emailError");
            valid = false;
        }
        if (!password) {
            showFieldError("password", "passwordError");
            valid = false;
        }
        if (!valid) return;

        setSubmitBusy(form, true);
        login(email.trim(), password, rememberLogin())
            .then(function () {
                showSuccess("Connexion reussie.");
                goToDashboard();
            })
            .catch(function (error) {
                core.showMessage("Connexion impossible. " + (error.message || ""));
            })
            .finally(function () {
                setSubmitBusy(form, false);
            });
    }

    function submitRegister(event, form) {
        event.preventDefault();
        event.stopImmediatePropagation();

        clearFieldErrors(form);
        const fullname = (form.querySelector("#fullname") || {}).value || "";
        const email = (form.querySelector("#email") || {}).value || "";
        const password = (form.querySelector("#password") || {}).value || "";
        const confirmPassword = (form.querySelector("#confirmPassword") || {}).value || "";
        const termsCheckbox = document.getElementById("termsCheckbox");
        const acceptedTerms = termsCheckbox && (termsCheckbox.classList.contains("checked") || termsCheckbox.getAttribute("aria-checked") === "true");
        let valid = true;

        if (!fullname.trim()) {
            showFieldError("fullname", "fullnameError");
            valid = false;
        }
        if (!validateEmail(email.trim())) {
            showFieldError("email", "emailError");
            valid = false;
        }
        if (password.length < 8) {
            showFieldError("password", "passwordError");
            valid = false;
        }
        if (password !== confirmPassword) {
            showFieldError("confirmPassword", "confirmError");
            valid = false;
        }
        if (!acceptedTerms) {
            if (termsCheckbox) {
                termsCheckbox.style.outline = "2px solid #ef4444";
                termsCheckbox.style.outlineOffset = "2px";
                window.setTimeout(function () {
                    termsCheckbox.style.outline = "";
                    termsCheckbox.style.outlineOffset = "";
                }, 2000);
            }
            valid = false;
        }
        if (!valid) return;

        const name = splitFullName(fullname);
        setSubmitBusy(form, true);
        register(name.nom, name.prenom, email.trim(), password, "", "", true)
            .then(function () {
                showSuccess("Compte cree avec succes.");
                goToDashboard();
            })
            .catch(function (error) {
                core.showMessage("Creation impossible. " + (error.message || ""));
            })
            .finally(function () {
                setSubmitBusy(form, false);
            });
    }

    function providerFromButton(button) {
        const id = core.normalize(button.id || "");
        if (id.includes("google")) return "google";
        if (id.includes("linkedin")) return "linkedin";
        return core.normalize(button.textContent || "social") || "social";
    }

    function openSocialLogin(event, button) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const provider = providerFromButton(button);
        socialLogin(provider, null, true);
    }

    function openRecovery(event) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const field = document.getElementById("email");
        const emailValue = field ? field.value.trim() : "";
        const openModal = app.actionUI && app.actionUI.openModal;
        if (!openModal) {
            core.showMessage("Module de recuperation indisponible.");
            return;
        }

        openModal({
            title: "Recuperation du mot de passe",
            message: "Saisissez votre email pour recevoir un lien de confirmation.",
            input: true,
            value: emailValue,
            placeholder: "email@exemple.com",
            confirmText: "Envoyer",
            onConfirm: function (email) {
                if (!validateEmail(email)) {
                    core.showMessage("Email invalide.");
                    return;
                }
                recoverPassword(email)
                    .then(function () { core.showMessage("Lien de recuperation envoye."); })
                    .catch(function (error) { core.showMessage("Envoi impossible. " + (error.message || "")); });
            }
        });
    }

    function handleSubmit(event) {
        const form = event.target;
        if (!form || !form.matches) return;
        if (form.matches("#loginForm")) {
            submitLogin(event, form);
            return;
        }
        if (form.matches("#signupForm, #registerForm, form[data-form-type='register']")) {
            submitRegister(event, form);
        }
    }

    function handleClick(event) {
        const socialButton = event.target.closest(".social-btn");
        if (socialButton && core.context.isAuth) {
            openSocialLogin(event, socialButton);
            return;
        }

        const forgotLink = event.target.closest("#forgotLink");
        if (forgotLink) openRecovery(event);
    }

    function init() {
        if (initialized) return;
        initialized = true;
        document.addEventListener("submit", handleSubmit, true);
        document.addEventListener("click", handleClick, true);
    }

    app.auth = {
        init: init,
        setToken: setToken,
        getToken: getToken,
        clearToken: clearToken,
        isAuthenticated: function () { return Boolean(getToken()); },
        login: login,
        register: register,
        socialLogin: socialLogin,
        recoverPassword: recoverPassword,
        logout: logout,
        getCurrentUser: currentUser
    };
})(window, document);
