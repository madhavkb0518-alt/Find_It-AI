
// ==========================================
// FINDIT AI - SUPABASE CONNECTION
// ==========================================

const SUPABASE_URL = "https://kgwjucabezpadkcosban.supabase.co";

const SUPABASE_KEY = "sb_publishable_P8yKblJj3wfIx0jauYkD8g_3E1vAoL6";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

console.log("FindIt AI connected to Supabase!");

// ==========================================
// USER AUTHENTICATION
// ==========================================

let currentUser = null;
let authMode = "signup";
let pendingReportType = null;

// Check current login session
async function initializeAuth() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("Session error:", error.message);
        return;
    }

    currentUser = data.session?.user || null;
    updateAuthButton();
}

// Update navigation button
function updateAuthButton() {
    const authButton = document.getElementById("authButton");

    if (!authButton) return;

    authButton.textContent = currentUser ? "Logout" : "Sign Up / Login";

    authButton.onclick = currentUser
        ? logoutUser
        : () => openAuthModal("signup");
}

// Open authentication modal
function openAuthModal(mode = "signup") {
    authMode = mode;

    document.getElementById("authModal").classList.add("show");

    updateAuthModal();
}

// Close authentication modal
function closeAuthModal() {
    document.getElementById("authModal").classList.remove("show");
    document.getElementById("authMessage").textContent = "";
}

// Change between signup and login
function switchAuthMode() {
    authMode = authMode === "signup" ? "login" : "signup";
    updateAuthModal();
}

// Update authentication modal content
function updateAuthModal() {
    const signup = authMode === "signup";

    document.getElementById("authTitle").textContent =
        signup ? "Create Account" : "Welcome Back";

    document.getElementById("authSubtitle").textContent =
        signup
            ? "Join FindIt AI and help reconnect lost belongings."
            : "Login to continue using FindIt AI.";

    document.getElementById("nameGroup").style.display =
        signup ? "block" : "none";

    document.getElementById("authName").required = signup;

    document.getElementById("authSubmit").textContent =
        signup ? "Create Account" : "Login";

    document.getElementById("authSwitchText").textContent =
        signup ? "Already have an account?" : "New to FindIt AI?";

    document.getElementById("authSwitchButton").textContent =
        signup ? "Login" : "Sign Up";

    document.getElementById("authMessage").textContent = "";
}

// Signup and login form
document.getElementById("authForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const fullName = document.getElementById("authName").value.trim();

    const submitButton = document.getElementById("authSubmit");
    const message = document.getElementById("authMessage");

    submitButton.disabled = true;
    message.textContent = "Please wait...";

    try {
        if (authMode === "signup") {

            if (!fullName) {
                throw new Error("Please enter your full name.");
            }

            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (error) throw error;

            if (data.session) {
                message.textContent = "Account created successfully!";
            } else {
                message.textContent =
                    "Account created! Please verify your email, then log in.";
                pendingReportType = null;
                return;
            }

        
} else {

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) throw error;

    // Update the logged-in user immediately
    currentUser = data.user;

    // Update navigation button
    updateAuthButton();

    // Close login modal
    closeAuthModal();

    // Open pending report form if required
    if (pendingReportType) {
        const type = pendingReportType;
        pendingReportType = null;
        openModal(type);
    }

    console.log("Login successful:", currentUser.email);
}


    } catch (error) {
        message.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});

// Listen for login/logout changes
supabaseClient.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;

    updateAuthButton();

    if (event === "SIGNED_IN" && currentUser) {
        closeAuthModal();

        if (pendingReportType) {
            const type = pendingReportType;
            pendingReportType = null;
            openModal(type);
        }
    }
});

// Logout
async function logoutUser() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        alert("Logout failed: " + error.message);
        return;
    }

    currentUser = null;
    updateAuthButton();

    alert("You have been logged out successfully.");
}

// Initialize authentication
initializeAuth();


// ==========================================
// SAMPLE ITEM DATA
// ==========================================

let items = [
    {
        id: 1,
        name: "Black Wireless Earbuds",
        category: "Electronics",
        type: "lost",
        location: "Atria College Library",
        date: "2026-11-18",
        description: "Black earbuds in a charging case.",
        image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=600"
    },
    {
        id: 2,
        name: "Blue Water Bottle",
        category: "Other",
        type: "found",
        location: "Cubbon Park",
        date: "2026-11-19",
        description: "Blue reusable water bottle.",
        image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600"
    },
    {
        id: 3,
        name: "Brown Leather Wallet",
        category: "Accessories",
        type: "lost",
        location: "Malleshwaram",
        date: "2026-11-17",
        description: "Brown wallet with personal cards.",
        image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600"
    },
    {
        id: 4,
        name: "Black Laptop Bag",
        category: "Bags",
        type: "found",
        location: "Bengaluru Bus Stop",
        date: "2026-11-16",
        description: "Black laptop bag left behind.",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600"
    },
    {
        id: 5,
        name: "Silver Smart Watch",
        category: "Electronics",
        type: "lost",
        location: "College Canteen",
        date: "2026-11-15",
        description: "Silver smartwatch with a dark strap.",
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600"
    },
    {
        id: 6,
        name: "Student ID Card",
        category: "Documents",
        type: "found",
        location: "College Entrance",
        date: "2026-11-14",
        description: "Student identification card.",
        image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600"
    }
];

let activeFilter = "all";


// ==========================================
// DISPLAY ITEMS
// ==========================================

function displayItems() {

    const grid = document.getElementById("itemGrid");

    const search = document.getElementById("searchInput")
        .value.toLowerCase();

    const category = document.getElementById("categoryFilter").value;

    let filtered = items.filter(item => {

        const matchesType =
            activeFilter === "all" || item.type === activeFilter;

        const matchesCategory =
            category === "all" || item.category === category;

        const matchesSearch =
            `${item.name} ${item.location} ${item.description}`
            .toLowerCase().includes(search);

        return matchesType && matchesCategory && matchesSearch;
    });

    grid.innerHTML = filtered.map(item => `
        <article class="item-card">

            <img class="item-image"
                src="${escapeHTML(item.image)}"
                alt="${escapeHTML(item.name)}"
                onerror="this.style.visibility='hidden'">

            <div class="item-info">

                <span class="item-badge ${item.type}-badge">
                    ${item.type.toUpperCase()} ITEM
                </span>

                <h3>${escapeHTML(item.name)}</h3>

                <p>📍 ${escapeHTML(item.location)}</p>

                <p>📅 ${escapeHTML(item.date)}</p>

                <p>${escapeHTML(item.description)}</p>

                <button onclick="viewItem(${item.id})">
                    View Details →
                </button>

            </div>
        </article>
    `).join("");

    document.getElementById("emptyMessage").style.display =
        filtered.length ? "none" : "block";
}


// ==========================================
// BASIC HTML ESCAPING
// ==========================================

function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


// ==========================================
// SEARCH AND FILTERS
// ==========================================

document.getElementById("searchInput")
    .addEventListener("input", displayItems);

document.getElementById("categoryFilter")
    .addEventListener("change", displayItems);

document.querySelectorAll(".filter").forEach(button => {

    button.addEventListener("click", () => {

        const activeButton = document.querySelector(".filter.active");

        if (activeButton) {
            activeButton.classList.remove("active");
        }

        button.classList.add("active");

        activeFilter = button.dataset.type;

        displayItems();
    });
});


// ==========================================
// OPEN REPORT MODAL
// ==========================================

function openModal(type) {

    // Require login before reporting an item
    if (!currentUser) {
        pendingReportType = type;
        openAuthModal("login");
        return;
    }

    const modal = document.getElementById("reportModal");

    document.getElementById("reportType").value = type;

    document.getElementById("modalTitle").textContent =
        type === "lost"
            ? "Report a Lost Item"
            : "Report a Found Item";

    modal.classList.add("show");
}



// ==========================================
// CLOSE REPORT MODAL
// ==========================================

function closeModal() {

    document.getElementById("reportModal")
        .classList.remove("show");
}


// ==========================================
// IMAGE PREVIEW
// ==========================================

document.getElementById("itemImage")
    .addEventListener("change", function() {

        const file = this.files[0];

        const preview = document.getElementById("imagePreview");

        if (file && file.type.startsWith("image/")) {

            preview.src = URL.createObjectURL(file);

            preview.style.display = "block";

        } else {

            preview.style.display = "none";

            preview.removeAttribute("src");
        }
    });


// ==========================================
// SUBMIT REPORT
// ==========================================

document.getElementById("reportForm")
    .addEventListener("submit", function(event) {

        event.preventDefault();

        const file = document.getElementById("itemImage").files[0];

        if (file && !file.type.startsWith("image/")) {

            alert("Please select a valid image.");

            return;
        }

        if (file && file.size > 5 * 1024 * 1024) {

            alert("Please select an image smaller than 5 MB.");

            return;
        }

        const newItem = {

            id: Date.now(),

            name: document.getElementById("itemName").value.trim(),

            category: document.getElementById("itemCategory").value,

            type: document.getElementById("reportType").value,

            location: document.getElementById("itemLocation").value.trim(),

            date: document.getElementById("itemDate").value,

            description: document.getElementById("itemDescription").value.trim(),

            image: ""
        };

        const addItem = () => {

            items.unshift(newItem);

            displayItems();

            updateStats();

            this.reset();

            document.getElementById("imagePreview").style.display = "none";

            closeModal();

            document.getElementById("items")
                .scrollIntoView({ behavior: "smooth" });

            alert("Your report has been added successfully!");
        };

        if (file) {

            const reader = new FileReader();

            reader.onload = function() {

                newItem.image = reader.result;

                addItem();
            };

            reader.onerror = () => {

                alert("Could not read the image.");
            };

            reader.readAsDataURL(file);

        } else {

            addItem();
        }
    });


// ==========================================
// VIEW ITEM DETAILS
// ==========================================

function viewItem(id) {

    const item = items.find(item => item.id === id);

    if (!item) return;

    alert(
        "ITEM DETAILS\n\n" +
        "Name: " + item.name +
        "\nType: " + item.type.toUpperCase() +
        "\nCategory: " + item.category +
        "\nLocation: " + item.location +
        "\nDate: " + item.date +
        "\nDescription: " + item.description +
        "\n\nThis is a demo listing. Claim verification will be added later."
    );
}


// ==========================================
// UPDATE STATISTICS
// ==========================================

function updateStats() {

    document.getElementById("lostCount").textContent =
        items.filter(item => item.type === "lost").length;

    document.getElementById("foundCount").textContent =
        items.filter(item => item.type === "found").length;
}


// ==========================================
// INITIALIZE WEBSITE
// ==========================================

displayItems();

updateStats();
