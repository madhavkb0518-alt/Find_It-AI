
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

async function sendPasswordReset() {
    const email = document.getElementById("authEmail").value.trim();
    const message = document.getElementById("authMessage");

    if (!email) {
        message.textContent = "Please enter your registered email first.";
        message.style.color = "red";
        document.getElementById("authEmail").focus();
        return;
    }

    message.textContent = "Sending password reset email...";
    message.style.color = "#2563eb";

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: "https://find-it-ai-lac.vercel.app"
    });

    if (error) {
        message.textContent = error.message;
        message.style.color = "red";
    } else {
        message.textContent = "Password reset link sent! Check your email inbox.";
        message.style.color = "green";
    }
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

    // Detect password recovery link
    if (event === "PASSWORD_RECOVERY") {
        openResetPasswordModal();
        return;
    }

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

let items = [];

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
    .addEventListener("submit", async function(event) {

    event.preventDefault();

    if (!currentUser) {
        alert("Please log in before submitting a report.");
        closeModal();
        openAuthModal();
        return;
    }

    const file = document.getElementById("itemImage").files[0];

    // Validate image
    if (file && !file.type.startsWith("image/")) {
        alert("Please select a valid image.");
        return;
    }

    if (file && file.size > 5 * 1024 * 1024) {
        alert("Please select an image smaller than 5 MB.");
        return;
    }

    const submitButton = this.querySelector(
        'button[type="submit"]'
    );

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
    }

    let imageURL = null;
    let imagePath = null;

    try {

        // STEP 1: Upload image to Supabase Storage
        if (file) {

            const safeFileName = file.name.replace(
                /[^a-zA-Z0-9._-]/g, "_"
            );

            imagePath = `${currentUser.id}/${Date.now()}-${safeFileName}`;

            const { data: uploadData, error: uploadError } =
                await supabaseClient.storage
                    .from("item-images")
                    .upload(imagePath, file, {
                        contentType: file.type,
                        upsert: false
                    });

            if (uploadError) {
                throw uploadError;
            }

            // Get public image URL
            const { data: publicData } =
                supabaseClient.storage
                    .from("item-images")
                    .getPublicUrl(uploadData.path);

            imageURL = publicData.publicUrl;
        }

        // STEP 2: Prepare database report
        const newItem = {

            user_id: currentUser.id,

            item_name: document.getElementById("itemName").value.trim(),

            category: document.getElementById("itemCategory").value,

            item_type: document.getElementById("reportType").value,

            description: document.getElementById("itemDescription").value.trim(),

            location: document.getElementById("itemLocation").value.trim(),

            item_date: document.getElementById("itemDate").value || null,

            image_url: imageURL,

            status: "active"
        };

        // STEP 3: Save report in Supabase database
        const { data, error } = await supabaseClient
            .from("items")
            .insert([newItem])
            .select()
            .single();

        if (error) {
            throw error;
        }

        // STEP 4: Update website display
        const savedItem = {

            id: data.id,

            name: data.item_name,

            category: data.category,

            type: data.item_type,

            location: data.location,

            date: data.item_date || "",

            description: data.description,

            image: data.image_url || ""
        };

        items.unshift(savedItem);

        displayItems();
        updateStats();

        // STEP 5: Reset form
        this.reset();

        document.getElementById("imagePreview").style.display = "none";

        closeModal();

        document.getElementById("items")
            .scrollIntoView({ behavior: "smooth" });

        alert("Your report and image have been saved successfully!");

    } catch (error) {

        console.error("Report submission error:", error);

        // Remove uploaded image if database save failed
        if (imagePath) {
            await supabaseClient.storage
                .from("item-images")
                .remove([imagePath]);
        }

        alert("Could not submit report: " + error.message);

    } finally {

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Submit Report";
        }
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

async function loadItemsFromSupabase() {
    const { data, error } = await supabaseClient
        .from("items")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error loading items:", error);
        alert("Unable to load reports. Please refresh the page.");
        return;
    }

    items = data.map(row => ({
        id: row.id,
        name: row.item_name,
        category: row.category,
        type: row.item_type,
        location: row.location,
        date: row.item_date || "",
        description: row.description,
        image: row.image_url || ""
    }));

    displayItems();
    updateStats();
}

loadItemsFromSupabase();

// OPEN RESET PASSWORD MODAL
function openResetPasswordModal() {
    document.getElementById("resetPasswordModal").classList.add("show");
}

// CLOSE RESET PASSWORD MODAL
function closeResetPasswordModal() {
    document.getElementById("resetPasswordModal").classList.remove("show");
}

// UPDATE PASSWORD
async function updatePassword(event) {
    event.preventDefault();

    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmNewPassword").value;
    const message = document.getElementById("resetPasswordMessage");

    if (newPassword !== confirmPassword) {
        message.textContent = "Passwords do not match!";
        message.style.color = "red";
        return;
    }

    message.textContent = "Updating password...";
    message.style.color = "#2563eb";

    const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
    });

    if (error) {
        message.textContent = error.message;
        message.style.color = "red";
        return;
    }

    message.textContent = "Password updated successfully! Please log in again.";
    message.style.color = "green";

    document.getElementById("resetPasswordForm").reset();

    setTimeout(() => {
        closeResetPasswordModal();
        closeAuthModal();
        supabaseClient.auth.signOut();
        openAuthModal("login");
    }, 2000);
}
