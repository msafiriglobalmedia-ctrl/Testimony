/* ============================================================
   TESTMONY V0.0.1
   app.js
   Connect beyond
   Founder: MSAFIRI WILLIAM MUNGA
   Company: ZetroLink Technology Limited
   ============================================================ */

'use strict';

/* ============================================================
   GLOBAL CONFIGURATION
   ============================================================ */

const API = window.location.origin;

const APP = {
    name: "Testmony",
    slogan: "Connect beyond",
    version: "Testmony V0.0.1",
    founder: "MSAFIRI WILLIAM MUNGA",
    company: "ZetroLink Technology Limited"
};

let currentUser = null;
let authToken = localStorage.getItem("testmony_token") || null;
let currentView = "home";
let currentDiscoveryPage = null;
let navigationStack = [];
let currentChat = null;
let stories = [];
let posts = [];
let chats = [];
let notifications = [];


/* ============================================================
   DOM HELPERS
   ============================================================ */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function createElement(tag, className = "", html = "") {
    const el = document.createElement(tag);

    if (className) {
        el.className = className;
    }

    if (html) {
        el.innerHTML = html;
    }

    return el;
}


/* ============================================================
   API HELPER
   ============================================================ */

async function apiRequest(endpoint, options = {}) {

    const headers = {
        ...(options.headers || {})
    };

    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
    }

    try {

        const response = await fetch(`${API}${endpoint}`, {
            ...options,
            headers
        });

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.message ||
                `Request failed: ${response.status}`
            );
        }

        return data;

    } catch (error) {

        console.error("API Error:", error);

        throw error;
    }
}


/* ============================================================
   TOAST
   ============================================================ */

function showToast(message, type = "info") {

    let container = $("#testmony-toast-container");

    if (!container) {

        container = createElement(
            "div",
            "toast-container"
        );

        container.id = "testmony-toast-container";

        document.body.appendChild(container);
    }

    const toast = createElement(
        "div",
        `toast toast-${type}`,
        `
            <span>${escapeHTML(message)}</span>
        `
    );

    container.appendChild(toast);

    setTimeout(() => {

        toast.classList.add("toast-hide");

        setTimeout(() => toast.remove(), 300);

    }, 3000);
}


/* ============================================================
   ESCAPE HTML
   ============================================================ */

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ============================================================
   SPLASH SCREEN
   ============================================================ */

function showSplash() {

    let splash = $("#testmony-splash");

    if (!splash) {

        splash = createElement(
            "div",
            "testmony-splash",
            `
                <div class="splash-glow"></div>

                <div class="splash-content">

                    <div class="testmony-logo heartbeat">
                        <span>T</span>
                    </div>

                    <div class="splash-title">
                        Testmony
                    </div>

                    <div class="splash-slogan">
                        Connect beyond
                    </div>

                </div>
            `
        );

        splash.id = "testmony-splash";

        document.body.appendChild(splash);
    }

    setTimeout(() => {

        splash.classList.add("splash-fade-out");

        setTimeout(() => {

            splash.remove();

            initializeApplication();

        }, 700);

    }, 6000);
}


/* ============================================================
   APPLICATION INITIALIZATION
   ============================================================ */

async function initializeApplication() {

    loadTheme();

    createApplicationShell();

    if (authToken) {

        try {

            await loadCurrentUser();

            showView("home");

        } catch {

            logout(false);

            showAuthScreen();
        }

    } else {

        showAuthScreen();
    }
}


/* ============================================================
   APPLICATION SHELL
   ============================================================ */

function createApplicationShell() {

    let app = $("#testmony-app");

    if (app) {
        return;
    }

    app = createElement(
        "div",
        "testmony-app",
        `
            <main id="testmony-content"></main>

            <nav class="bottom-navigation">

                <button
                    class="nav-button active"
                    data-view="home"
                    aria-label="Home"
                >
                    <span class="nav-icon">⌂</span>
                    <span>Home</span>
                </button>

                <button
                    class="nav-button"
                    data-view="discovery"
                    aria-label="Discovery"
                >
                    <span class="nav-icon">◈</span>
                    <span>Discovery</span>
                </button>

                <button
                    class="nav-button"
                    data-view="chats"
                    aria-label="Chats"
                >
                    <span class="nav-icon">◌</span>
                    <span>Chats</span>
                </button>

                <button
                    class="nav-button"
                    data-view="profile"
                    aria-label="Profile"
                >
                    <span class="nav-icon">♙</span>
                    <span>Profile</span>
                </button>

            </nav>
        `
    );

    app.id = "testmony-app";

    document.body.appendChild(app);

    $$(".nav-button").forEach(button => {

        button.addEventListener("click", () => {

            const view = button.dataset.view;

            showView(view);
        });
    });
}


/* ============================================================
   VIEW ROUTER
   ============================================================ */

function showView(view) {

    currentView = view;

    const content = $("#testmony-content");

    if (!content) {
        return;
    }

    updateBottomNavigation(view);

    switch (view) {

        case "home":
            renderHome(content);
            break;

        case "discovery":
            renderDiscovery(content);
            break;

        case "chats":
            renderChats(content);
            break;

        case "profile":
            renderProfile(content);
            break;

        default:
            renderHome(content);
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* ============================================================
   BOTTOM NAVIGATION
   ============================================================ */

function updateBottomNavigation(view) {

    $$(".nav-button").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.view === view
        );
    });
}


/* ============================================================
   AUTH SCREEN
   ============================================================ */

function showAuthScreen() {

    const app = $("#testmony-app");

    if (app) {
        app.remove();
    }

    let auth = $("#testmony-auth");

    if (auth) {
        auth.remove();
    }

    auth = createElement(
        "div",
        "auth-screen",
        `
            <div class="auth-card">

                <div class="auth-logo">
                    <div class="testmony-logo">
                        <span>T</span>
                    </div>
                </div>

                <h1>Testmony</h1>

                <p class="auth-slogan">
                    Connect beyond
                </p>

                <div id="auth-content"></div>

            </div>
        `
    );

    auth.id = "testmony-auth";

    document.body.appendChild(auth);

    renderLoginForm();
}


/* ============================================================
   LOGIN FORM
   ============================================================ */

function renderLoginForm() {

    const container = $("#auth-content");

    if (!container) {
        return;
    }

    container.innerHTML = `
        <form id="login-form">

            <h2>Welcome back</h2>

            <p class="muted">
                Login to your Testmony account.
            </p>

            <input
                id="login-identifier"
                type="text"
                placeholder="Email or username"
                autocomplete="username"
                required
            >

            <input
                id="login-password"
                type="password"
                placeholder="Password"
                autocomplete="current-password"
                required
            >

            <button type="submit" class="primary-button">
                Login
            </button>

            <div class="auth-divider">
                <span>OR</span>
            </div>

            <button
                type="button"
                id="show-register"
                class="secondary-button"
            >
                Create Account
            </button>

        </form>
    `;

    $("#login-form").addEventListener(
        "submit",
        handleLogin
    );

    $("#show-register").addEventListener(
        "click",
        renderRegisterForm
    );
}


/* ============================================================
   REGISTER FORM
   ============================================================ */

function renderRegisterForm() {

    const container = $("#auth-content");

    if (!container) {
        return;
    }

    container.innerHTML = `
        <form id="register-form">

            <h2>Create your account</h2>

            <p class="muted">
                Join Testmony and connect beyond.
            </p>

            <input
                id="register-name"
                type="text"
                placeholder="Full name"
                required
            >

            <input
                id="register-username"
                type="text"
                placeholder="Username"
                required
            >

            <input
                id="register-email"
                type="email"
                placeholder="Email"
                required
            >

            <input
                id="register-password"
                type="password"
                placeholder="Password"
                minlength="6"
                required
            >

            <button type="submit" class="primary-button">
                Create Account
            </button>

            <button
                type="button"
                id="back-login"
                class="secondary-button"
            >
                Back to Login
            </button>

        </form>
    `;

    $("#register-form").addEventListener(
        "submit",
        handleRegister
    );

    $("#back-login").addEventListener(
        "click",
        renderLoginForm
    );
}


/* ============================================================
   LOGIN
   ============================================================ */

async function handleLogin(event) {

    event.preventDefault();

    const identifier =
        $("#login-identifier").value.trim();

    const password =
        $("#login-password").value;

    if (!identifier || !password) {

        showToast(
            "Please complete all fields.",
            "error"
        );

        return;
    }

    try {

        const data = await apiRequest(
            "/api/auth/login",
            {
                method: "POST",
                body: JSON.stringify({
                    identifier,
                    email: identifier,
                    username: identifier,
                    password
                })
            }
        );

        authToken =
            data.access_token ||
            data.token ||
            data.accessToken;

        if (!authToken) {

            throw new Error(
                "Server did not return a login token."
            );
        }

        localStorage.setItem(
            "testmony_token",
            authToken
        );

        await loadCurrentUser();

        $("#testmony-auth")?.remove();

        createApplicationShell();

        showView("home");

        showToast(
            "Welcome back to Testmony.",
            "success"
        );

    } catch (error) {

        showToast(
            error.message || "Login failed.",
            "error"
        );
    }
}


/* ============================================================
   REGISTER
   ============================================================ */

async function handleRegister(event) {

    event.preventDefault();

    const name =
        $("#register-name").value.trim();

    const username =
        $("#register-username").value.trim();

    const email =
        $("#register-email").value.trim();

    const password =
        $("#register-password").value;

    try {

        const data = await apiRequest(
            "/api/auth/register",
            {
                method: "POST",
                body: JSON.stringify({
                    name,
                    full_name: name,
                    username,
                    email,
                    password
                })
            }
        );

        showToast(
            "Account created successfully.",
            "success"
        );

        renderLoginForm();

    } catch (error) {

        showToast(
            error.message || "Registration failed.",
            "error"
        );
    }
}


/* ============================================================
   CURRENT USER
   ============================================================ */

async function loadCurrentUser() {

    try {

        const data = await apiRequest(
            "/api/auth/me"
        );

        currentUser =
            data.user ||
            data;

        return currentUser;

    } catch (error) {

        console.error(
            "Unable to load current user",
            error
        );

        throw error;
    }
}


/* ============================================================
   HOME
   ============================================================ */

function renderHome(content) {

    content.innerHTML = `
        <section class="page home-page">

            <header class="top-header">

                <div>
                    <div class="brand-small">
                        Testmony
                    </div>

                    <div class="brand-slogan">
                        Connect beyond
                    </div>
                </div>

                <button
                    id="home-menu"
                    class="icon-button"
                    aria-label="Menu"
                >
                    ⋮
                </button>

            </header>

            <div class="search-container">

                <input
                    id="global-search"
                    type="search"
                    placeholder="Search people on Testmony..."
                >

            </div>

            <div class="feed-tabs">

                <button
                    class="feed-tab active"
                    data-feed="for-you"
                >
                    For You
                </button>

                <button
                    class="feed-tab"
                    data-feed="following"
                >
                    Following
                </button>

            </div>

            <section id="stories-section">
                ${renderStoriesHTML()}
            </section>

            <button
                id="create-post-button"
                class="floating-create"
                aria-label="Create post"
            >
                +
            </button>

            <section id="feed-container">

                <div class="loading-state">
                    Loading posts...
                </div>

            </section>

        </section>
    `;

    $("#home-menu").addEventListener(
        "click",
        openHomeMenu
    );

    $("#global-search").addEventListener(
        "keydown",
        handleGlobalSearch
    );

    $("#create-post-button").addEventListener(
        "click",
        openCreatePost
    );

    $$(".feed-tab").forEach(tab => {

        tab.addEventListener(
            "click",
            () => {

                $$(".feed-tab").forEach(t =>
                    t.classList.remove("active")
                );

                tab.classList.add("active");

                loadFeed(tab.dataset.feed);
            }
        );
    });

    loadStories();
    loadFeed("for-you");
}


/* ============================================================
   STORIES
   ============================================================ */

function renderStoriesHTML() {

    return `
        <div class="stories-wrapper">

            <div class="stories-header">
                <strong>Stories</strong>
            </div>

            <div
                id="stories-list"
                class="stories-list"
            >

                <button
                    class="story-item my-story"
                    id="my-story-button"
                >

                    <div class="story-avatar add-story">
                        +
                    </div>

                    <span>My Story</span>

                </button>

            </div>

        </div>
    `;
}


async function loadStories() {

    const container = $("#stories-list");

    if (!container) {
        return;
    }

    try {

        const data = await apiRequest(
            "/api/stories"
        );

        stories =
            data.stories ||
            data ||
            [];

        renderStories();

    } catch {

        renderStories();
    }

    $("#my-story-button")?.addEventListener(
        "click",
        openCreateStory
    );
}


function renderStories() {

    const container = $("#stories-list");

    if (!container) {
        return;
    }

    container.innerHTML = `
        <button
            class="story-item my-story"
            id="my-story-button"
        >

            <div class="story-avatar add-story">
                +
            </div>

            <span>My Story</span>

        </button>
    `;

    stories.forEach(story => {

        const item = createElement(
            "button",
            "story-item",
            `
                <div class="story-avatar story-ring">

                    <img
                        src="${escapeHTML(
                            story.user?.avatar ||
                            story.avatar ||
                            "/static/default-avatar.png"
                        )}"
                        alt=""
                    >

                </div>

                <span>
                    ${escapeHTML(
                        story.user?.name ||
                        story.username ||
                        "User"
                    )}
                </span>
            `
        );

        item.addEventListener(
            "click",
            () => openStory(story)
        );

        container.appendChild(item);
    });

    $("#my-story-button")?.addEventListener(
        "click",
        openCreateStory
    );
}


/* ============================================================
   STORY CREATOR
   ============================================================ */

function openCreateStory() {

    openModal(
        "Create Story",
        `
            <div class="story-create">

                <textarea
                    id="story-text"
                    placeholder="Write a story..."
                ></textarea>

                <label class="file-picker">
                    📷 Add Photo / Video
                    <input
                        id="story-media"
                        type="file"
                        accept="image/*,video/*,audio/*"
                    >
                </label>

                <button
                    id="publish-story"
                    class="primary-button"
                >
                    Post Story
                </button>

            </div>
        `
    );

    $("#publish-story").addEventListener(
        "click",
        publishStory
    );
}


async function publishStory() {

    const text =
        $("#story-text")?.value.trim() || "";

    const file =
        $("#story-media")?.files?.[0];

    const form = new FormData();

    if (text) {
        form.append("text", text);
    }

    if (file) {
        form.append("media", file);
    }

    try {

        await apiRequest(
            "/api/stories",
            {
                method: "POST",
                body: form
            }
        );

        closeModal();

        showToast(
            "Story posted.",
            "success"
        );

        loadStories();

    } catch (error) {

        showToast(
            error.message ||
            "Unable to publish story.",
            "error"
        );
    }
}


/* ============================================================
   STORY VIEWER
   ============================================================ */

function openStory(story) {

    openModal(
        "Story",
        `
            <div class="story-viewer">

                ${
                    story.media_url
                    ?
                    `<img
                        src="${escapeHTML(story.media_url)}"
                        alt="Story"
                    >`
                    :
                    ""
                }

                <p>
                    ${escapeHTML(
                        story.text || ""
                    )}
                </p>

            </div>
        `
    );
}


/* ============================================================
   FEED
   ============================================================ */

async function loadFeed(type = "for-you") {

    const container = $("#feed-container");

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="loading-state">
            Loading feed...
        </div>
    `;

    try {

        const endpoint =
            type === "following"
                ? "/api/feed?feed=following"
                : "/api/feed?feed=for-you";

        const data = await apiRequest(endpoint);

        posts =
            data.posts ||
            data ||
            [];

        renderPosts();

    } catch (error) {

        console.error(error);

        renderDemoPosts();
    }
}


function renderPosts() {

    const container = $("#feed-container");

    if (!container) {
        return;
    }

    if (!posts.length) {

        container.innerHTML = `
            <div class="empty-state">
                <h3>No posts yet</h3>
                <p>
                    Be the first person to share something
                    on Testmony.
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML = "";

    posts.forEach(post => {

        container.appendChild(
            createPostElement(post)
        );
    });
}


/* ============================================================
   DEMO POSTS
   ============================================================ */

function renderDemoPosts() {

    const container = $("#feed-container");

    if (!container) {
        return;
    }

    const demoPosts = [

        {
            id: "demo-1",
            user: {
                name: "Testmony",
                username: "testmony",
                avatar: ""
            },
            text:
                "Welcome to Testmony — Connect beyond.",
            created_at: new Date().toISOString(),
            likes_count: 0,
            comments_count: 0,
            shares_count: 0
        },

        {
            id: "demo-2",
            user: {
                name: "MSAFIRI",
                username: "msafiri",
                avatar: ""
            },
            text:
                "A new social platform built to connect people, knowledge and opportunities.",
            created_at: new Date().toISOString(),
            likes_count: 0,
            comments_count: 0,
            shares_count: 0
        }

    ];

    container.innerHTML = "";

    demoPosts.forEach(post => {

        container.appendChild(
            createPostElement(post)
        );
    });
}


/* ============================================================
   POST ELEMENT
   ============================================================ */

function createPostElement(post) {

    const article = createElement(
        "article",
        "post-card"
    );

    const user = post.user || {};

    const avatar =
        user.avatar ||
        post.avatar ||
        "/static/default-avatar.png";

    article.innerHTML = `

        <div class="post-header">

            <img
                class="post-avatar"
                src="${escapeHTML(avatar)}"
                alt=""
            >

            <div class="post-user">

                <strong>
                    ${escapeHTML(
                        user.name ||
                        post.name ||
                        "Testmony User"
                    )}
                </strong>

                <span>
                    @${escapeHTML(
                        user.username ||
                        post.username ||
                        "user"
                    )}
                </span>

            </div>

            <button
                class="post-menu"
                aria-label="Post menu"
            >
                ⋮
            </button>

        </div>

        ${
            post.text
            ?
            `
            <div class="post-text">
                ${escapeHTML(post.text)}
            </div>
            `
            :
            ""
        }

        ${
            post.media_url
            ?
            renderPostMedia(post)
            :
            ""
        }

        <div class="post-actions">

            <button
                class="post-action like-button"
                data-id="${escapeHTML(post.id)}"
            >
                ♡
                <span>
                    ${post.likes_count || 0}
                </span>
            </button>

            <button
                class="post-action comment-button"
                data-id="${escapeHTML(post.id)}"
            >
                ◯
                <span>
                    ${post.comments_count || 0}
                </span>
            </button>

            <button
                class="post-action save-button"
                data-id="${escapeHTML(post.id)}"
            >
                ☆
            </button>

            <button
                class="post-action share-button"
                data-id="${escapeHTML(post.id)}"
            >
                ↗
                <span>
                    ${post.shares_count || 0}
                </span>
            </button>

        </div>
    `;

    article
        .querySelector(".like-button")
        ?.addEventListener(
            "click",
            () => toggleLike(post.id)
        );

    article
        .querySelector(".comment-button")
        ?.addEventListener(
            "click",
            () => openComments(post)
        );

    article
        .querySelector(".save-button")
        ?.addEventListener(
            "click",
            () => savePost(post.id)
        );

    article
        .querySelector(".share-button")
        ?.addEventListener(
            "click",
            () => sharePost(post)
        );

    article
        .querySelector(".post-menu")
        ?.addEventListener(
            "click",
            () => openPostMenu(post)
        );

    return article;
}


/* ============================================================
   POST MEDIA
   ============================================================ */

function renderPostMedia(post) {

    const url =
        escapeHTML(post.media_url);

    const type =
        post.media_type ||
        "";

    if (type.startsWith("video")) {

        return `
            <video
                class="post-media"
                controls
                playsinline
                src="${url}"
            ></video>
        `;
    }

    return `
        <img
            class="post-media"
            src="${url}"
            alt="Post media"
            loading="lazy"
        >
    `;
}


/* ============================================================
   CREATE POST
   ============================================================ */

function openCreatePost() {

    openModal(
        "Create Post",
        `
            <form id="create-post-form">

                <textarea
                    id="post-text"
                    placeholder="What's happening?"
                    rows="5"
                ></textarea>

                <label class="file-picker">

                    📎 Add media

                    <input
                        id="post-media"
                        type="file"
                        accept="image/*,video/*,.pdf,.doc,.docx"
                    >

                </label>

                <button
                    type="submit"
                    class="primary-button"
                >
                    Post
                </button>

            </form>
        `
    );

    $("#create-post-form").addEventListener(
        "submit",
        publishPost
    );
}


async function publishPost(event) {

    event.preventDefault();

    const text =
        $("#post-text").value.trim();

    const file =
        $("#post-media").files[0];

    if (!text && !file) {

        showToast(
            "Write something or select media.",
            "error"
        );

        return;
    }

    const form = new FormData();

    if (text) {
        form.append("text", text);
    }

    if (file) {
        form.append("media", file);
    }

    try {

        await apiRequest(
            "/api/posts",
            {
                method: "POST",
                body: form
            }
        );

        closeModal();

        showToast(
            "Post published.",
            "success"
        );

        loadFeed();

    } catch (error) {

        showToast(
            error.message ||
            "Unable to publish post.",
            "error"
        );
    }
}


/* ============================================================
   LIKE
   ============================================================ */

async function toggleLike(postId) {

    try {

        await apiRequest(
            `/api/posts/${postId}/like`,
            {
                method: "POST"
            }
        );

        showToast(
            "Post updated.",
            "success"
        );

        loadFeed();

    } catch {

        showToast(
            "Like unavailable right now.",
            "error"
        );
    }
}


/* ============================================================
   SAVE
   ============================================================ */

async function savePost(postId) {

    try {

        await apiRequest(
            `/api/posts/${postId}/save`,
            {
                method: "POST"
            }
        );

        showToast(
            "Post saved.",
            "success"
        );

    } catch {

        showToast(
            "Save unavailable.",
            "error"
        );
    }
}


/* ============================================================
   COMMENTS
   ============================================================ */

function openComments(post) {

    openModal(
        "Comments",
        `
            <div id="comments-container">

                <div class="loading-state">
                    Loading comments...
                </div>

            </div>

            <form id="comment-form">

                <input
                    id="comment-text"
                    placeholder="Write a comment..."
                    required
                >

                <button
                    class="primary-button"
                    type="submit"
                >
                    Send
                </button>

            </form>
        `
    );

    loadComments(post.id);

    $("#comment-form").addEventListener(
        "submit",
        event => submitComment(
            event,
            post.id
        )
    );
}


async function loadComments(postId) {

    try {

        const data = await apiRequest(
            `/api/posts/${postId}/comments`
        );

        const comments =
            data.comments ||
            data ||
            [];

        const container =
            $("#comments-container");

        container.innerHTML =
            comments.length
                ?
                comments.map(comment => `
                    <div class="comment">

                        <strong>
                            ${escapeHTML(
                                comment.user?.name ||
                                comment.username ||
                                "User"
                            )}
                        </strong>

                        <p>
                            ${escapeHTML(
                                comment.text || ""
                            )}
                        </p>

                    </div>
                `).join("")
                :
                `<p class="muted">
                    No comments yet.
                </p>`;

    } catch {

        $("#comments-container").innerHTML =
            `<p class="muted">
                No comments available.
            </p>`;
    }
}


async function submitComment(event, postId) {

    event.preventDefault();

    const input =
        $("#comment-text");

    const text =
        input.value.trim();

    if (!text) {
        return;
    }

    try {

        await apiRequest(
            `/api/posts/${postId}/comments`,
            {
                method: "POST",
                body: JSON.stringify({
                    text
                })
            }
        );

        input.value = "";

        loadComments(postId);

    } catch {

        showToast(
            "Unable to send comment.",
            "error"
        );
    }
}


/* ============================================================
   SHARE
   ============================================================ */

async function sharePost(post) {

    const shareUrl =
        `${window.location.origin}/post/${post.id}`;

    try {

        if (
            navigator.share
        ) {

            await navigator.share({
                title: "Testmony",
                text:
                    post.text ||
                    "Check this post on Testmony.",
                url: shareUrl
            });

        } else {

            await navigator.clipboard.writeText(
                shareUrl
            );

            showToast(
                "Post link copied.",
                "success"
            );
        }

    } catch (error) {

        console.log(error);
    }
}


/* ============================================================
   POST MENU
   ============================================================ */

function openPostMenu(post) {

    openModal(
        "Post options",
        `
            <div class="menu-list">

                <button
                    data-action="report"
                    class="menu-item"
                >
                    🚩 Report
                </button>

                <button
                    data-action="block"
                    class="menu-item"
                >
                    🚫 Block user
                </button>

                <button
                    data-action="copy"
                    class="menu-item"
                >
                    🔗 Copy link
                </button>

            </div>
        `
    );

    $$("[data-action]").forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                const action =
                    button.dataset.action;

                if (action === "copy") {

                    await navigator.clipboard.writeText(
                        `${window.location.origin}/post/${post.id}`
                    );

                    showToast(
                        "Link copied.",
                        "success"
                    );
                }

                if (action === "report") {

                    showToast(
                        "Report submitted.",
                        "success"
                    );
                }

                if (action === "block") {

                    showToast(
                        "User blocked.",
                        "success"
                    );
                }

                closeModal();
            }
        );
    });
}


/* ============================================================
   GLOBAL SEARCH
   ============================================================ */

async function handleGlobalSearch(event) {

    if (event.key !== "Enter") {
        return;
    }

    const query =
        event.target.value.trim();

    if (!query) {
        return;
    }

    showSearchResults(query);
}


async function showSearchResults(query) {

    openModal(
        "Search",
        `
            <div id="search-results">

                <div class="loading-state">
                    Searching...
                </div>

            </div>
        `
    );

    try {

        const data = await apiRequest(
            `/api/search?q=${encodeURIComponent(query)}`
        );

        const users =
            data.users ||
            data.people ||
            [];

        const container =
            $("#search-results");

        if (!users.length) {

            container.innerHTML = `
                <div class="empty-state">
                    No users found.
                </div>
            `;

            return;
        }

        container.innerHTML =
            users.map(user => `

                <button
                    class="search-user"
                    data-user-id="${escapeHTML(user.id)}"
                >

                    <img
                        src="${escapeHTML(
                            user.avatar ||
                            "/static/default-avatar.png"
                        )}"
                        alt=""
                    >

                    <div>

                        <strong>
                            ${escapeHTML(
                                user.name ||
                                user.username
                            )}
                        </strong>

                        <span>
                            @${escapeHTML(
                                user.username || ""
                            )}
                        </span>

                    </div>

                </button>

            `).join("");

        $$(".search-user").forEach(item => {

            item.addEventListener(
                "click",
                () => {

                    closeModal();

                    openUserProfile(
                        item.dataset.userId
                    );
                }
            );
        });

    } catch {

        $("#search-results").innerHTML =
            `<p class="muted">
                Search is currently unavailable.
            </p>`;
    }
}


/* ============================================================
   DISCOVERY
   ============================================================ */

function renderDiscovery(content) {

    content.innerHTML = `
        <section class="page discovery-page">

            <header class="top-header">

                <div>
                    <h1>Discovery</h1>

                    <p>
                        Explore more of Testmony.
                    </p>
                </div>

                <button
                    class="icon-button"
                    id="discovery-menu"
                >
                    ⋮
                </button>

            </header>

            <div class="discovery-grid">

                ${discoveryCard(
                    "📖",
                    "AI Council",
                    "Education, Health, Agriculture & Research",
                    "ai"
                )}

                ${discoveryCard(
                    "🎨",
                    "Creative Studio",
                    "Images, Videos & Documents",
                    "studio"
                )}

                ${discoveryCard(
                    "🛍️",
                    "Market",
                    "Products, Services & Digital",
                    "market"
                )}

                ${discoveryCard(
                    "🌍",
                    "World Map",
                    "Explore people around the world",
                    "map"
                )}

                ${discoveryCard(
                    "📺",
                    "Channels",
                    "News and media channels",
                    "channels"
                )}

                ${discoveryCard(
                    "👥",
                    "Communities",
                    "Groups and communities",
                    "communities"
                )}

                ${discoveryCard(
                    "▶️",
                    "Videos",
                    "Short vertical videos",
                    "videos"
                )}

                ${discoveryCard(
                    "⚙️",
                    "Settings",
                    "Preferences and account",
                    "settings"
                )}

            </div>

        </section>
    `;

    $$(".discovery-card").forEach(card => {

        card.addEventListener(
            "click",
            () => {

                openDiscoveryPage(
                    card.dataset.page
                );
            }
        );
    });
}


function discoveryCard(
    icon,
    title,
    description,
    page
) {

    return `
        <button
            class="discovery-card"
            data-page="${page}"
        >

            <div class="discovery-icon">
                ${icon}
            </div>

            <div class="discovery-title">
                ${title}
            </div>

            <div class="discovery-description">
                ${description}
            </div>

            <div class="discovery-arrow">
                →
            </div>

        </button>
    `;
}


/* ============================================================
   DISCOVERY CONTINUOUS NAVIGATION
   ============================================================ */

function openDiscoveryPage(page) {

    navigationStack.push({
        view: currentView,
        page: currentDiscoveryPage
    });

    currentDiscoveryPage = page;

    const content =
        $("#testmony-content");

    switch (page) {

        case "ai":
            renderAICouncil(content);
            break;

        case "studio":
            renderCreativeStudio(content);
            break;

        case "market":
            renderMarket(content);
            break;

        case "map":
            renderWorldMap(content);
            break;

        case "channels":
            renderChannels(content);
            break;

        case "communities":
            renderCommunities(content);
            break;

        case "videos":
            renderVideos(content);
            break;

        case "settings":
            renderSettings(content);
            break;

        default:
            renderDiscovery(content);
    }
}


/* ============================================================
   DISCOVERY HEADER
   ============================================================ */

function discoveryHeader(title) {

    return `
        <header class="subpage-header">

            <button
                class="back-button"
                id="discovery-back"
            >
                ←
            </button>

            <h1>${escapeHTML(title)}</h1>

        </header>
    `;
}


function activateDiscoveryBack() {

    $("#discovery-back")?.addEventListener(
        "click",
        () => {

            if (navigationStack.length) {

                navigationStack.pop();

                renderDiscovery(
                    $("#testmony-content")
                );

                currentDiscoveryPage = null;

            } else {

                showView("discovery");
            }
        }
    );
}


/* ============================================================
   AI COUNCIL
   ============================================================ */

function renderAICouncil(content) {

    content.innerHTML = `
        <section class="page subpage">

            ${discoveryHeader("AI Council")}

            <p class="section-description">
                Choose an AI assistant.
            </p>

            <div class="feature-list">

                ${featureItem(
                    "📖",
                    "Education AI",
                    "Study notes, curriculum, books and past papers.",
                    "education"
                )}

                ${featureItem(
                    "❤️",
                    "Health AI",
                    "General health information.",
                    "health"
                )}

                ${featureItem(
                    "🌿",
                    "Agriculture AI",
                    "Farming, crops and soil information.",
                    "agriculture"
                )}

                ${featureItem(
                    "🔍",
                    "Research AI",
                    "Research methodology and citations.",
                    "research"
                )}

                ${featureItem(
                    "📐",
                    "AI Canvas",
                    "AI-powered workspace.",
                    "canvas"
                )}

            </div>

        </section>
    `;

    $$(".feature-item").forEach(item => {

        item.addEventListener(
            "click",
            () => {

                const feature =
                    item.dataset.feature;

                openAIFeature(feature);
            }
        );
    });
}


function featureItem(
    icon,
    title,
    description,
    feature
) {

    return `
        <button
            class="feature-item"
            data-feature="${feature}"
        >

            <span class="feature-icon">
                ${icon}
            </span>

            <span class="feature-content">

                <strong>
                    ${title}
                </strong>

                <small>
                    ${description}
                </small>

            </span>

            <span>
                →
            </span>

        </button>
    `;
}


/* ============================================================
   EDUCATION AI
   ============================================================ */

function openAIFeature(feature) {

    if (feature === "education") {

        renderEducationCountries();
        return;
    }

    renderAIChat(
        feature
    );
}


function renderEducationCountries() {

    const content =
        $("#testmony-content");

    const countries = [
        "Tanzania",
        "Kenya",
        "Uganda",
        "Rwanda",
        "Burundi",
        "South Africa",
        "Nigeria",
        "Ghana",
        "United Kingdom",
        "United States",
        "Canada",
        "Australia",
        "India",
        "China",
        "Japan",
        "Germany",
        "France",
        "Brazil"
    ];

    content.innerHTML = `
        <section class="page subpage">

            ${discoveryHeader(
                "Education AI — Choose Country"
            )}

            <div class="option-grid">

                ${countries.map(country => `
                    <button
                        class="option-card education-country"
                        data-country="${escapeHTML(country)}"
                    >
                        🌍
                        <span>
                            ${escapeHTML(country)}
                        </span>
                    </button>
                `).join("")}

            </div>

        </section>
    `;

    $$(".education-country").forEach(button => {

        button.addEventListener(
            "click",
            () => {

                renderEducationLevels(
                    button.dataset.country
                );
            }
        );
    });

    activateDiscoveryBack();
}


/* ============================================================
   EDUCATION LEVEL
   ============================================================ */

function renderEducationLevels(country) {

    const levels = [
        "Nursery / Early Childhood",
        "Primary",
        "Secondary",
        "High School",
        "Certificate",
        "Diploma",
        "Degree",
        "Master",
        "PhD"
    ];

    const content =
        $("#testmony-content");

    content.innerHTML = `
        <section class="page subpage">

            ${discoveryHeader(
                `Education — ${country}`
            )}

            <p class="section-description">
                Choose your education level.
            </p>

            <div class="option-list">

                ${levels.map(level => `
                    <button
                        class="option-row education-level"
                        data-country="${escapeHTML(country)}"
                        data-level="${escapeHTML(level)}"
                    >
                        ${escapeHTML(level)}
                        <span>→</span>
                    </button>
                `).join("")}

            </div>

        </section>
    `;

    $$(".education-level").forEach(button => {

        button.addEventListener(
            "click",
            () => {

                renderEducationContent(
                    button.dataset.country,
                    button.dataset.level
                );
            }
        );
    });

    activateDiscoveryBack();
}


/* ============================================================
   EDUCATION CONTENT
   ============================================================ */

function renderEducationContent(
    country,
    level
) {

    const content =
        $("#testmony-content");

    const types = [
        "Notes",
        "Books",
        "Past Papers",
        "Marking Schemes"
    ];

    content.innerHTML = `
        <section class="page subpage">

            ${discoveryHeader(
                `${level} — ${country}`
            )}

            <p class="section-description">
                Choose educational content.
            </p>

            <div class="option-grid">

                ${types.map(type => `
                    <button
                        class="option-card education-content"
                        data-country="${escapeHTML(country)}"
                        data-level="${escapeHTML(level)}"
                        data-content="${escapeHTML(type)}"
                    >

                        📚

                        <strong>
                            ${escapeHTML(type)}
                        </strong>

                    </button>
                `).join("")}

            </div>

        </section>
    `;

    $$(".education-content").forEach(button => {

        button.addEventListener(
            "click",
            () => {

                renderAIChat(
                    "education",
                    {
                        country:
                            button.dataset.country,
                        level:
                            button.dataset.level,
                        content:
                            button.dataset.content
                    }
                );
            }
        );
    });

    activateDiscoveryBack();
}


/* ============================================================
   AI CHAT
   ============================================================ */

function renderAIChat(
    type,
    context = {}
) {

    const content =
        $("#testmony-content");

    const title =
        type === "education"
            ? "Education AI"
            : `${capitalize(type)} AI`;

    content.innerHTML = `
        <section class="page ai-chat-page">

            ${discoveryHeader(title)}

            <div class="ai-context">

                ${
                    context.country
                    ?
                    `<span>
                        🌍 ${escapeHTML(context.country)}
                    </span>`
                    :
                    ""
                }

                ${
                    context.level
                    ?
                    `<span>
                        🎓 ${escapeHTML(context.level)}
                    </span>`
                    :
                    ""
                }

                ${
                    context.content
                    ?
                    `<span>
                        📚 ${escapeHTML(context.content)}
                    </span>`
                    :
                    ""
                }

            </div>

            <div
                id="ai-messages"
                class="ai-messages"
            >

                <div class="ai-message assistant">

                    Hello! I'm your
                    ${escapeHTML(title)}
                    assistant.

                    ${
                        context.country
                        ?
                        `Ask me anything about
                        ${escapeHTML(context.content)}
                        for
                        ${escapeHTML(context.level)}
                        in
                        ${escapeHTML(context.country)}.`
                        :
                        "How can I help you today?"
                    }

                </div>

            </div>

            <form
                id="ai-chat-form"
                class="ai-input-area"
            >

                <input
                    id="ai-input"
                    placeholder="Ask Testmony AI..."
                    autocomplete="off"
                >

                <button
                    type="submit"
                    class="send-button"
                >
                    ➤
                </button>

            </form>

        </section>
    `;

    $("#ai-chat-form").addEventListener(
        "submit",
        event => sendAIMessage(
            event,
            type,
            context
        )
    );

    activateDiscoveryBack();
}


async function sendAIMessage(
    event,
    type,
    context
) {

    event.preventDefault();

    const input =
        $("#ai-input");

    const message =
        input.value.trim();

    if (!message) {
        return;
    }

    const messages =
        $("#ai-messages");

    messages.insertAdjacentHTML(
        "beforeend",
        `
            <div class="ai-message user">
                ${escapeHTML(message)}
            </div>
        `
    );

    input.value = "";

    messages.insertAdjacentHTML(
        "beforeend",
        `
            <div
                class="ai-message assistant"
                id="ai-thinking"
            >
                Thinking...
            </div>
        `
    );

    try {

        const data = await apiRequest(
            "/api/ai/chat",
            {
                method: "POST",
                body: JSON.stringify({
                    message,
                    type,
                    context
                })
            }
        );

        $("#ai-thinking")?.remove();

        messages.insertAdjacentHTML(
            "beforeend",
            `
                <div class="ai-message assistant">
                    ${escapeHTML(
                        data.response ||
                        data.message ||
                        "I received your question."
                    )}
                </div>
            `
        );

    } catch {

        $("#ai-thinking")?.remove();

        messages.insertAdjacentHTML(
            "beforeend",
            `
                <div class="ai-message assistant">
                    AI backend is not connected yet.
                    This interface is ready for the
                    future AI integration.
                </div>
            `
        );
    }

    messages.scrollTop =
        messages.scrollHeight;
}


/* ============================================================
   CREATIVE STUDIO
   ============================================================ */

function renderCreativeStudio(content) {

    content.innerHTML = `
        <section class="page subpage">

            ${discoveryHeader(
                "Creative Studio"
            )}

            <div class="feature-list">

                ${featureItem(
                    "🖼️",
                    "Image Creator",
                    "Create posters, covers and graphics.",
                    "image"
                )}

                ${featureItem(
                    "🎬",
                    "Video Creator",
                    "Create and edit short videos.",
                    "video"
                )}

                ${featureItem(
                    "📄",
                    "Document Creator",
                    "Create digital documents.",
                    "document"
                )}

                ${featureItem(
                    "✨",
                    "Design Assistant",
                    "AI-assisted creative ideas.",
                    "design"
                )}

            </div>

            <div class="placeholder-box">

                <strong>
                    Creative Studio
                </strong>

                <p>
                    Canva-style tools will be
                    expanded in Phase 7.
                </p>

            </div>

        </section>
    `;

    activateDiscoveryBack();
}


/* ============================================================
   MARKET
   ============================================================ */

function renderMarket(content) {

    content.innerHTML = `
        <section class="page subpage">

            ${discoveryHeader("Testmony Market")}

            <input
                class="market-search"
                placeholder="Search products and services..."
            >

            <div class="category-grid">

                <button class="category-card">
                    📦
                    Products
                </button>

                <button class="category-card">
                    🛠️
                    Services
                </button>

                <button class="category-card">
                    💾
                    Digital
                </button>

                <button class="category-card">
                    💼
                    Business
                </button>

            </div>

            <div class="placeholder-box">

                <h3>Market</h3>

                <p>
                    Products, services and digital
                    marketplace features will be
                    expanded in Phase 8.
                </p>

            </div>

            <button
                id="upload-product"
                class="primary-button"
            >
                + Sell Something
            </button>

        </section>
    `;

    $("#upload-product").addEventListener(
        "click",
        openProductForm
    );

    activateDiscoveryBack();
}


function openProductForm() {

    openModal(
        "Sell on Testmony",
        `
            <form id="product-form">

                <input
                    id="product-name"
                    placeholder="Product name"
                    required
                >

                <textarea
                    id="product-description"
                    placeholder="Description"
                ></textarea>

                <input
                    id="product-price"
                    type="number"
                    placeholder="Price"
                >

                <input
                    id="product-location"
                    placeholder="Location"
                >

                <input
                    id="product-image"
                    type="file"
                    accept="image/*"
                >

                <button
                    type="submit"
                    class="primary-button"
                >
                    Publish Product
                </button>

            </form>
        `
    );

    $("#product-form").addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            showToast(
                "Market publishing API will be connected in Phase 8.",
                "info"
            );

            closeModal();
        }
    );
}


/* ============================================================
   WORLD MAP
   ============================================================ */

function renderWorldMap(content) {

    content.innerHTML = `
        <section class="page subpage">

            ${discoveryHeader(
                "World Map"
            )}

            <div class="world-map-placeholder">

                <div class="map-globe">
                    🌍
                </div>

                <h2>
                    Explore the world
                </h2>

                <p>
                    Discover Testmony users,
                    communities and content
                    around the world.
                </p>

            </div>

        </section>
    `;

    activateDiscoveryBack();
}


/* ============================================================
   CHANNELS
   ============================================================ */

function renderChannels(content) {

    const channels = [
        ["BBC News", "Global news from UK", "🔴"],
        ["CNN", "Cable News Network", "🔴"],
        ["Al Jazeera", "International news", "🟠"],
        ["ITV News", "UK broadcaster", "🔵"],
        ["Testmony Media", "Our own channel", "🔷"]
    ];

    content.innerHTML = `
        <section class="page subpage">

            ${discoveryHeader(
                "Channels"
            )}

            <div class="channel-list">

                ${channels.map(channel => `

                    <button
                        class="channel-card"
                    >

                        <div class="channel-logo">
                            ${channel[2]}
                        </div>

                        <div>

                            <strong>
                                ${channel[0]}
                            </strong>

                            <p>
                                ${channel[1]}
                            </p>

                        </div>

                        <span>
                            →
                        </span>

                    </button>

                `).join("")}

            </div>

        </section>
    `;

    activateDiscoveryBack();
}


/* ============================================================
   COMMUNITIES
   ============================================================ */

function renderCommunities(content) {

    const categories = [
        "Education",
        "Technology",
        "Business",
        "Health",
        "Agriculture",
        "Entertainment",
        "Sports",
        "Religion",
        "Language"
    ];

    content.innerHTML = `
        <section class="page subpage">

            ${discoveryHeader(
                "Communities"
            )}

            <div class="category-grid">

                ${categories.map(
                    category => `
                        <button
                            class="category-card"
                        >
                            👥
                            ${category}
                        </button>
                    `
                ).join("")}

            </div>

            <button
                class="primary-button"
                id="create-community"
            >
                + Create Community
            </button>

        </section>
    `;

    activateDiscoveryBack();
}


/* ============================================================
   VIDEOS
   ============================================================ */

function renderVideos(content) {

    content.innerHTML = `
        <section class="page videos-page">

            ${discoveryHeader(
                "Testmony Videos"
            )}

            <div
                id="video-feed"
                class="video-feed"
            >

                <div class="video-placeholder">

                    <div>
                        ▶
                    </div>

                    <h2>
                        Testmony Videos
                    </h2>

                    <p>
                        Short-form vertical video
                        feed.
                    </p>

                </div>

            </div>

        </section>
    `;

    activateDiscoveryBack();
}


/* ============================================================
   SETTINGS
   ============================================================ */

function renderSettings(content) {

    content.innerHTML = `
        <section class="page subpage">

            ${discoveryHeader(
                "Settings"
            )}

            <div class="settings-list">

                <button
                    class="setting-item"
                    id="user-manual"
                >
                    📖
                    <span>
                        <strong>User Manual</strong>
                        <small>
                            Learn how to use Testmony
                        </small>
                    </span>
                    →
                </button>

                <button
                    class="setting-item"
                    id="theme-toggle"
                >
                    🌓
                    <span>
                        <strong>Theme</strong>
                        <small>
                            Light / Dark
                        </small>
                    </span>
                    →
                </button>

                <div class="setting-item">

                    ℹ️

                    <span>

                        <strong>
                            Version
                        </strong>

                        <small>
                            ${APP.version}
                        </small>

                    </span>

                </div>

                <button
                    class="setting-item danger"
                    id="logout-button"
                >
                    🚪
                    <span>
                        <strong>Logout</strong>
                        <small>
                            Sign out of Testmony
                        </small>
                    </span>
                    →
                </button>

            </div>

        </section>
    `;

    $("#user-manual").addEventListener(
        "click",
        openUserManual
    );

    $("#theme-toggle").addEventListener(
        "click",
        toggleTheme
    );

    $("#logout-button").addEventListener(
        "click",
        () => logout(true)
    );

    activateDiscoveryBack();
}


/* ============================================================
   USER MANUAL
   ============================================================ */

function openUserManual() {

    openModal(
        "Testmony User Manual",
        `
            <div class="manual">

                <div class="manual-logo">
                    <div class="testmony-logo">
                        <span>T</span>
                    </div>
                </div>

                <h1>
                    TESTMONY
                </h1>

                <p>
                    Connect beyond
                </p>

                <hr>

                <h3>
                    About Testmony
                </h3>

                <p>
                    Testmony is a social,
                    communication and AI platform
                    designed to connect people,
                    knowledge and opportunities.
                </p>

                <p>
                    <strong>Founder:</strong>
                    ${APP.founder}
                </p>

                <p>
                    <strong>Company:</strong>
                    ${APP.company}
                </p>

                <p>
                    <strong>Version:</strong>
                    ${APP.version}
                </p>

                <h3>
                    Sections
                </h3>

                <ul>
                    <li>Home — Feed, Stories and Posts</li>
                    <li>Discovery — AI, Studio, Market, Map and Communities</li>
                    <li>Chats — Messaging and Calls</li>
                    <li>Profile — Your personal profile</li>
                </ul>

                <h3>
                    How to Use Testmony
                </h3>

                <ol>
                    <li>Create your account.</li>
                    <li>Complete your profile.</li>
                    <li>Create posts and stories.</li>
                    <li>Follow people.</li>
                    <li>Chat with other users.</li>
                    <li>Explore Discovery.</li>
                    <li>Use Education AI.</li>
                </ol>

                <button
                    id="download-manual"
                    class="primary-button"
                >
                    📥 Download User Manual
                </button>

            </div>
        `
    );

    $("#download-manual").addEventListener(
        "click",
        downloadUserManual
    );
}


function downloadUserManual() {

    const text = `
TESTMONY — USER MANUAL

Connect beyond

Founder:
${APP.founder}

Company:
${APP.company}

Version:
${APP.version}

ABOUT TESTMONY
Testmony is a social, communication and AI platform.

SECTIONS

1. Home
Feed, Stories and Posts.

2. Discovery
AI Council, Creative Studio, Market,
World Map, Channels, Communities,
Videos and Settings.

3. Chats
Messaging, voice notes, files,
voice calls and video calls.

4. Profile
Profile information, posts,
followers and following.

HOW TO USE

Create Account:
Register and complete your account information.

Create Post:
Open Home and press +.

Create Story:
Open Stories and press My Story.

Chat:
Open Chats or search for a person.

AI:
Discovery → AI Council → Education AI.

MARKET:
Discovery → Market.

SUPPORT:
${APP.company}

TESTMONY
Connect beyond.
`;

    const blob =
        new Blob(
            [text],
            {
                type: "text/plain;charset=utf-8"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        "Testmony-UserManual.txt";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
}


/* ============================================================
   CHATS
   ============================================================ */

function renderChats(content) {

    content.innerHTML = `
        <section class="page chats-page">

            <header class="top-header">

                <div>

                    <h1>
                        Chats
                    </h1>

                    <p>
                        Stay connected.
                    </p>

                </div>

                <button
                    id="new-chat"
                    class="icon-button"
                >
                    +
                </button>

            </header>

            <div
                id="chat-list"
                class="chat-list"
            >

                <div class="loading-state">
                    Loading conversations...
                </div>

            </div>

        </section>
    `;

    $("#new-chat").addEventListener(
        "click",
        openNewChat
    );

    loadChats();
}


async function loadChats() {

    const container =
        $("#chat-list");

    if (!container) {
        return;
    }

    try {

        const data = await apiRequest(
            "/api/messages/conversations"
        );

        chats =
            data.conversations ||
            data ||
            [];

        renderChatList();

    } catch {

        renderChatList();
    }
}


function renderChatList() {

    const container =
        $("#chat-list");

    if (!container) {
        return;
    }

    if (!chats.length) {

        container.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    💬
                </div>

                <h3>
                    No conversations
                </h3>

                <p>
                    Start a conversation with
                    someone on Testmony.
                </p>

            </div>
        `;

        return;
    }

    container.innerHTML = "";

    chats.forEach(chat => {

        const item = createElement(
            "button",
            "chat-list-item"
        );

        item.innerHTML = `

            <img
                src="${escapeHTML(
                    chat.avatar ||
                    "/static/default-avatar.png"
                )}"
                alt=""
            >

            <div class="chat-preview">

                <strong>
                    ${escapeHTML(
                        chat.name ||
                        chat.username ||
                        "User"
                    )}
                </strong>

                <span>
                    ${escapeHTML(
                        chat.last_message ||
                        ""
                    )}
                </span>

            </div>

            <small>
                ${escapeHTML(
                    chat.time ||
                    ""
                )}
            </small>
        `;

        item.addEventListener(
            "click",
            () => openChat(chat)
        );

        container.appendChild(item);
    });
}


/* ============================================================
   NEW CHAT
   ============================================================ */

function openNewChat() {

    openModal(
        "New Chat",
        `
            <input
                id="chat-user-search"
                class="full-input"
                placeholder="Search people..."
            >

            <div
                id="chat-search-results"
                class="search-results"
            ></div>
        `
    );

    $("#chat-user-search").addEventListener(
        "input",
        debounce(
            searchChatUsers,
            400
        )
    );
}


async function searchChatUsers(event) {

    const query =
        event.target.value.trim();

    if (!query) {
        $("#chat-search-results").innerHTML = "";
        return;
    }

    try {

        const data = await apiRequest(
            `/api/search/users?q=${encodeURIComponent(query)}`
        );

        const users =
            data.users ||
            data ||
            [];

        $("#chat-search-results").innerHTML =
            users.map(user => `
                <button
                    class="search-user"
                    data-id="${escapeHTML(user.id)}"
                >

                    <img
                        src="${escapeHTML(
                            user.avatar ||
                            "/static/default-avatar.png"
                        )}"
                        alt=""
                    >

                    <span>
                        ${escapeHTML(
                            user.name ||
                            user.username
                        )}
                    </span>

                </button>
            `).join("");

        $$(".search-user").forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const user =
                        users.find(
                            u =>
                                String(u.id) ===
                                String(button.dataset.id)
                        );

                    closeModal();

                    if (user) {
                        openChat({
                            user_id: user.id,
                            name:
                                user.name ||
                                user.username,
                            avatar:
                                user.avatar
                        });
                    }
                }
            );
        });

    } catch {

        showToast(
            "Search unavailable.",
            "error"
        );
    }
}


/* ============================================================
   CHAT WINDOW
   ============================================================ */

function openChat(chat) {

    currentChat = chat;

    const content =
        $("#testmony-content");

    content.innerHTML = `
        <section class="page chat-window">

            <header class="chat-header">

                <button
                    id="chat-back"
                    class="icon-button"
                >
                    ←
                </button>

                <img
                    src="${escapeHTML(
                        chat.avatar ||
                        "/static/default-avatar.png"
                    )}"
                    alt=""
                >

                <div>

                    <strong>
                        ${escapeHTML(
                            chat.name ||
                            chat.username ||
                            "User"
                        )}
                    </strong>

                    <small>
                        online
                    </small>

                </div>

                <div class="chat-header-actions">

                    <button
                        id="voice-call"
                        class="icon-button"
                    >
                        ☎
                    </button>

                    <button
                        id="video-call"
                        class="icon-button"
                    >
                        ▣
                    </button>

                    <button
                        id="chat-options"
                        class="icon-button"
                    >
                        ⋮
                    </button>

                </div>

            </header>

            <div
                id="messages-container"
                class="messages-container"
            >
                <div class="loading-state">
                    Loading messages...
                </div>
            </div>

            <form
                id="message-form"
                class="message-composer"
            >

                <button
                    type="button"
                    id="message-attach"
                    class="icon-button"
                >
                    +
                </button>

                <input
                    id="message-input"
                    placeholder="Message..."
                    autocomplete="off"
                >

                <button
                    type="button"
                    id="voice-note"
                    class="icon-button"
                >
                    🎙
                </button>

                <button
                    type="submit"
                    class="send-button"
                >
                    ➤
                </button>

            </form>

        </section>
    `;

    $("#chat-back").addEventListener(
        "click",
        () => showView("chats")
    );

    $("#message-form").addEventListener(
        "submit",
        sendMessage
    );

    $("#voice-call").addEventListener(
        "click",
        startVoiceCall
    );

    $("#video-call").addEventListener(
        "click",
        startVideoCall
    );

    $("#message-attach").addEventListener(
        "click",
        openAttachmentMenu
    );

    loadMessages(chat);
}


/* ============================================================
   LOAD MESSAGES
   ============================================================ */

async function loadMessages(chat) {

    const container =
        $("#messages-container");

    if (!container) {
        return;
    }

    try {

        const id =
            chat.id ||
            chat.conversation_id;

        const data = await apiRequest(
            `/api/messages/conversations/${id}`
        );

        const messages =
            data.messages ||
            data ||
            [];

        renderMessages(messages);

    } catch {

        container.innerHTML = `
            <div class="empty-state">
                <p>
                    Start your conversation.
                </p>
            </div>
        `;
    }
}


function renderMessages(messages) {

    const container =
        $("#messages-container");

    container.innerHTML = "";

    messages.forEach(message => {

        const mine =
            String(
                message.sender_id
            ) === String(
                currentUser?.id
            );

        const bubble =
            createElement(
                "div",
                `message-bubble ${
                    mine ? "mine" : "theirs"
                }`
            );

        bubble.innerHTML = `
            <p>
                ${escapeHTML(
                    message.text ||
                    message.content ||
                    ""
                )}
            </p>

            <small>
                ${escapeHTML(
                    message.time ||
                    ""
                )}
            </small>
        `;

        container.appendChild(bubble);
    });

    container.scrollTop =
        container.scrollHeight;
}


/* ============================================================
   SEND MESSAGE
   ============================================================ */

async function sendMessage(event) {

    event.preventDefault();

    const input =
        $("#message-input");

    const text =
        input.value.trim();

    if (!text) {
        return;
    }

    try {

        const conversationId =
            currentChat.id ||
            currentChat.conversation_id;

        await apiRequest(
            `/api/messages/conversations/${conversationId}`,
            {
                method: "POST",
                body: JSON.stringify({
                    text,
                    content: text,
                    message: text
                })
            }
        );

        input.value = "";

        loadMessages(currentChat);

    } catch {

        showToast(
            "Unable to send message.",
            "error"
        );
    }
}


/* ============================================================
   ATTACHMENTS
   ============================================================ */

function openAttachmentMenu() {

    openModal(
        "Send",
        `
            <div class="attachment-grid">

                <button
                    id="send-photo"
                    class="attachment-button"
                >
                    📷
                    Photo
                </button>

                <button
                    id="send-video"
                    class="attachment-button"
                >
                    🎬
                    Video
                </button>

                <button
                    id="send-document"
                    class="attachment-button"
                >
                    📄
                    Document
                </button>

                <button
                    id="send-file"
                    class="attachment-button"
                >
                    📎
                    File
                </button>

            </div>

            <input
                id="chat-file-input"
                type="file"
                hidden
            >
        `
    );

    $$(".attachment-button").forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const input =
                    $("#chat-file-input");

                if (button.id === "send-photo") {

                    input.accept =
                        "image/*";
                }

                if (button.id === "send-video") {

                    input.accept =
                        "video/*";
                }

                if (button.id === "send-document") {

                    input.accept =
                        ".pdf,.doc,.docx,.txt";
                }

                input.click();

                input.onchange =
                    uploadChatFile;
            }
        );
    });
}


async function uploadChatFile() {

    const file =
        $("#chat-file-input").files[0];

    if (!file) {
        return;
    }

    const form =
        new FormData();

    form.append(
        "file",
        file
    );

    try {

        await apiRequest(
            "/api/messages/media",
            {
                method: "POST",
                body: form
            }
        );

        closeModal();

        showToast(
            "File sent.",
            "success"
        );

    } catch {

        showToast(
            "Unable to upload file.",
            "error"
        );
    }
}


/* ============================================================
   VOICE / VIDEO CALL PLACEHOLDER
   ============================================================ */

function startVoiceCall() {

    showCallInterface(
        "Voice Call",
        "☎"
    );
}


function startVideoCall() {

    showCallInterface(
        "Video Call",
        "▣"
    );
}


function showCallInterface(
    title,
    icon
) {

    openModal(
        title,
        `
            <div class="call-interface">

                <div class="call-avatar">
                    ${icon}
                </div>

                <h2>
                    ${escapeHTML(
                        currentChat?.name ||
                        "User"
                    )}
                </h2>

                <p>
                    Connecting...
                </p>

                <button
                    id="end-call"
                    class="danger-button"
                >
                    End Call
                </button>

            </div>
        `
    );

    $("#end-call").addEventListener(
        "click",
        closeModal
    );
}


/* ============================================================
   PROFILE
   ============================================================ */

function renderProfile(content) {

    const user =
        currentUser || {};

    content.innerHTML = `
        <section class="page profile-page">

            <header class="top-header">

                <h1>
                    Profile
                </h1>

                <button
                    id="profile-menu"
                    class="icon-button"
                >
                    ⋮
                </button>

            </header>

            <div class="profile-cover"></div>

            <div class="profile-info">

                <img
                    class="profile-avatar"
                    src="${escapeHTML(
                        user.avatar ||
                        "/static/default-avatar.png"
                    )}"
                    alt=""
                >

                <h2>
                    ${escapeHTML(
                        user.name ||
                        "Testmony User"
                    )}
                </h2>

                <p>
                    @${escapeHTML(
                        user.username ||
                        "user"
                    )}
                </p>

                <p class="profile-bio">
                    ${escapeHTML(
                        user.bio ||
                        "Connect beyond."
                    )}
                </p>

                <div class="profile-stats">

                    <div>
                        <strong>
                            ${user.posts_count || 0}
                        </strong>
                        <span>Posts</span>
                    </div>

                    <div>
                        <strong>
                            ${user.followers_count || 0}
                        </strong>
                        <span>Followers</span>
                    </div>

                    <div>
                        <strong>
                            ${user.following_count || 0}
                        </strong>
                        <span>Following</span>
                    </div>

                </div>

                <button
                    id="edit-profile"
                    class="secondary-button"
                >
                    Edit Profile
                </button>

            </div>

            <div
                id="profile-posts"
                class="profile-posts"
            >

                <div class="loading-state">
                    Loading posts...
                </div>

            </div>

        </section>
    `;

    $("#edit-profile").addEventListener(
        "click",
        openEditProfile
    );

    $("#profile-menu").addEventListener(
        "click",
        openProfileMenu
    );

    loadProfilePosts();
}


/* ============================================================
   EDIT PROFILE
   ============================================================ */

function openEditProfile() {

    const user =
        currentUser || {};

    openModal(
        "Edit Profile",
        `
            <form id="edit-profile-form">

                <input
                    id="edit-name"
                    value="${escapeHTML(
                        user.name || ""
                    )}"
                    placeholder="Full name"
                >

                <input
                    id="edit-username"
                    value="${escapeHTML(
                        user.username || ""
                    )}"
                    placeholder="Username"
                >

                <textarea
                    id="edit-bio"
                    placeholder="Bio"
                >${escapeHTML(
                    user.bio || ""
                )}</textarea>

                <input
                    id="edit-location"
                    value="${escapeHTML(
                        user.location || ""
                    )}"
                    placeholder="Location"
                >

                <button
                    type="submit"
                    class="primary-button"
                >
                    Save Changes
                </button>

            </form>
        `
    );

    $("#edit-profile-form").addEventListener(
        "submit",
        saveProfile
    );
}


async function saveProfile(event) {

    event.preventDefault();

    try {

        const data =
            await apiRequest(
                "/api/profile",
                {
                    method: "PUT",
                    body: JSON.stringify({
                        name:
                            $("#edit-name").value,
                        username:
                            $("#edit-username").value,
                        bio:
                            $("#edit-bio").value,
                        location:
                            $("#edit-location").value
                    })
                }
            );

        currentUser =
            data.user ||
            data;

        closeModal();

        renderProfile(
            $("#testmony-content")
        );

        showToast(
            "Profile updated.",
            "success"
        );

    } catch {

        showToast(
            "Unable to update profile.",
            "error"
        );
    }
}


/* ============================================================
   PROFILE POSTS
   ============================================================ */

async function loadProfilePosts() {

    const container =
        $("#profile-posts");

    if (!container) {
        return;
    }

    try {

        const id =
            currentUser?.id;

        const data =
            await apiRequest(
                `/api/profile/${id}/posts`
            );

        const profilePosts =
            data.posts ||
            data ||
            [];

        container.innerHTML = "";

        profilePosts.forEach(post => {

            container.appendChild(
                createPostElement(post)
            );
        });

    } catch {

        container.innerHTML = `
            <div class="empty-state">
                No posts yet.
            </div>
        `;
    }
}


/* ============================================================
   USER PROFILE
   ============================================================ */

async function openUserProfile(userId) {

    const content =
        $("#testmony-content");

    content.innerHTML = `
        <section class="page profile-page">

            <header class="subpage-header">

                <button
                    id="user-profile-back"
                    class="back-button"
                >
                    ←
                </button>

                <h1>
                    Profile
                </h1>

            </header>

            <div
                id="user-profile-content"
                class="loading-state"
            >
                Loading profile...
            </div>

        </section>
    `;

    $("#user-profile-back").addEventListener(
        "click",
        () => showView("home")
    );

    try {

        const data =
            await apiRequest(
                `/api/profile/${userId}`
            );

        const user =
            data.user ||
            data;

        $("#user-profile-content").innerHTML = `
            <div class="public-profile">

                <img
                    class="profile-avatar"
                    src="${escapeHTML(
                        user.avatar ||
                        "/static/default-avatar.png"
                    )}"
                    alt=""
                >

                <h2>
                    ${escapeHTML(
                        user.name ||
                        user.username
                    )}
                </h2>

                <p>
                    @${escapeHTML(
                        user.username || ""
                    )}
                </p>

                <p>
                    ${escapeHTML(
                        user.bio || ""
                    )}
                </p>

                <div class="profile-stats">

                    <div>
                        <strong>
                            ${user.posts_count || 0}
                        </strong>
                        <span>Posts</span>
                    </div>

                    <div>
                        <strong>
                            ${user.followers_count || 0}
                        </strong>
                        <span>Followers</span>
                    </div>

                    <div>
                        <strong>
                            ${user.following_count || 0}
                        </strong>
                        <span>Following</span>
                    </div>

                </div>

                <button
                    class="primary-button"
                    id="start-user-chat"
                >
                    Message
                </button>

                <button
                    class="secondary-button"
                    id="follow-user"
                >
                    Follow
                </button>

            </div>
        `;

        $("#start-user-chat").addEventListener(
            "click",
            () => {

                showView("chats");

                setTimeout(() => {

                    openChat({
                        user_id: user.id,
                        name:
                            user.name ||
                            user.username,
                        avatar:
                            user.avatar
                    });

                }, 100);
            }
        );

        $("#follow-user").addEventListener(
            "click",
            () => followUser(user.id)
        );

    } catch {

        $("#user-profile-content").innerHTML =
            `<p>
                Unable to load profile.
            </p>`;
    }
}


/* ============================================================
   FOLLOW
   ============================================================ */

async function followUser(userId) {

    try {

        await apiRequest(
            `/api/users/${userId}/follow`,
            {
                method: "POST"
            }
        );

        showToast(
            "Follow status updated.",
            "success"
        );

    } catch {

        showToast(
            "Unable to update follow status.",
            "error"
        );
    }
}


/* ============================================================
   PROFILE MENU
   ============================================================ */

function openProfileMenu() {

    openModal(
        "Profile",
        `
            <div class="menu-list">

                <button
                    id="profile-manual"
                    class="menu-item"
                >
                    📖 User Manual
                </button>

                <button
                    id="profile-theme"
                    class="menu-item"
                >
                    🌓 Theme
                </button>

                <button
                    id="profile-logout"
                    class="menu-item danger"
                >
                    🚪 Logout
                </button>

            </div>
        `
    );

    $("#profile-manual").addEventListener(
        "click",
        openUserManual
    );

    $("#profile-theme").addEventListener(
        "click",
        toggleTheme
    );

    $("#profile-logout").addEventListener(
        "click",
        () => logout(true)
    );
}


/* ============================================================
   HOME 3-DOTS MENU
   ============================================================ */

function openHomeMenu() {

    openModal(
        "Testmony",
        `
            <div class="menu-list">

                <button
                    id="home-manual"
                    class="menu-item"
                >
                    📖 User Manual
                </button>

                <button
                    id="home-theme"
                    class="menu-item"
                >
                    🌓 Theme
                </button>

                <button
                    id="home-version"
                    class="menu-item"
                >
                    ℹ️ ${APP.version}
                </button>

                <button
                    id="home-logout"
                    class="menu-item danger"
                >
                    🚪 Logout
                </button>

            </div>
        `
    );

    $("#home-manual").addEventListener(
        "click",
        openUserManual
    );

    $("#home-theme").addEventListener(
        "click",
        toggleTheme
    );

    $("#home-version").addEventListener(
        "click",
        () => {

            showToast(
                APP.version,
                "info"
            );

            closeModal();
        }
    );

    $("#home-logout").addEventListener(
        "click",
        () => logout(true)
    );
}


/* ============================================================
   LOGOUT
   ============================================================ */

async function logout(
    showMessage = true
) {

    try {

        if (authToken) {

            await apiRequest(
                "/api/auth/logout",
                {
                    method: "POST"
                }
            ).catch(() => {});
        }

    } finally {

        authToken = null;
        currentUser = null;

        localStorage.removeItem(
            "testmony_token"
        );

        $("#testmony-app")?.remove();

        closeModal();

        showAuthScreen();

        if (showMessage) {

            showToast(
                "You have been logged out.",
                "success"
            );
        }
    }
}


/* ============================================================
   THEME
   ============================================================ */

function loadTheme() {

    const theme =
        localStorage.getItem(
            "testmony_theme"
        ) || "dark";

    document.documentElement.dataset.theme =
        theme;
}


function toggleTheme() {

    const current =
        document.documentElement.dataset.theme ||
        "dark";

    const next =
        current === "dark"
            ? "light"
            : "dark";

    document.documentElement.dataset.theme =
        next;

    localStorage.setItem(
        "testmony_theme",
        next
    );

    showToast(
        `${capitalize(next)} mode enabled.`,
        "success"
    );

    closeModal();
}


/* ============================================================
   MODAL
   ============================================================ */

function openModal(
    title,
    body
) {

    closeModal();

    const modal =
        createElement(
            "div",
            "modal-overlay"
        );

    modal.id =
        "testmony-modal";

    modal.innerHTML = `

        <div class="modal-card">

            <header class="modal-header">

                <h2>
                    ${escapeHTML(title)}
                </h2>

                <button
                    id="modal-close"
                    class="icon-button"
                >
                    ×
                </button>

            </header>

            <div class="modal-body">

                ${body}

            </div>

        </div>
    `;

    document.body.appendChild(modal);

    $("#modal-close").addEventListener(
        "click",
        closeModal
    );

    modal.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {
                closeModal();
            }
        }
    );
}


function closeModal() {

    $("#testmony-modal")?.remove();
}


/* ============================================================
   UTILITIES
   ============================================================ */

function capitalize(value) {

    if (!value) {
        return "";
    }

    return value.charAt(0).toUpperCase() +
        value.slice(1);
}


function debounce(
    callback,
    delay
) {

    let timeout;

    return function (...args) {

        clearTimeout(timeout);

        timeout = setTimeout(
            () => callback.apply(this, args),
            delay
        );
    };
}


/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeModal();
        }
    }
);


/* ============================================================
   START TESTMONY
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        showSplash();

    }
);


/* ============================================================
   END OF TESTMONY APP.JS
   ============================================================ */
