
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
let notificationSubscription = null;
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
    const myReportsLink = document.getElementById("myReportsLink");
    const myReportsSection = document.getElementById("my-reports");
    const matchesSection = document.getElementById("possible-matches");
    const claimsSection = document.getElementById("claim-requests");
    const chatSection = document.getElementById("private-chat");
    const notificationWrapper = document.getElementById("notificationWrapper");
    const notificationPanel = document.getElementById("notificationPanel");

    if (!authButton) return;

    authButton.textContent = currentUser ? "Logout" : "Sign Up / Login";

    authButton.onclick = currentUser
        ? logoutUser
        : () => openAuthModal("signup");

    // Show My Reports only when logged in
    if (myReportsLink) {
        myReportsLink.style.display = currentUser ? "inline-block" : "none";
    }

    if (myReportsSection) {
        myReportsSection.style.display = currentUser ? "block" : "none";
    }

    if (matchesSection) {
        matchesSection.style.display = currentUser ? "block" : "none";
    }

    if (claimsSection) {
        claimsSection.style.display = currentUser ? "block" : "none";
    }

    if (chatSection) {
        chatSection.style.display = currentUser ? "block" : "none";
    }

    // Show notification bell only when logged in
    if (notificationWrapper) {
        notificationWrapper.style.display = currentUser ? "block" : "none";
    }

    if (currentUser) {
        loadNotifications();
    } else {
        if (notificationPanel) {
            notificationPanel.style.display = "none";
        }

        const notificationCount = document.getElementById("notificationCount");

        if (notificationCount) {
            notificationCount.textContent = "0";
            notificationCount.style.display = "none";
        }
    }
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

    // Load data when logged in
    if (currentUser) {

        loadMyReports();
        loadPossibleMatches();
        loadClaims();
        loadChatClaims();

        // Connect real-time notifications
        subscribeToNotifications();

    } else {

        // Stop notification updates after logout
        if (notificationSubscription) {
            supabaseClient.removeChannel(notificationSubscription);
            notificationSubscription = null;
        }

        const grid = document.getElementById("myReportsGrid");
        const matchesGrid = document.getElementById("matchesGrid");
        const claimsGrid = document.getElementById("claimsGrid");

        if (grid) grid.innerHTML = "";
        if (matchesGrid) matchesGrid.innerHTML = "";
        if (claimsGrid) claimsGrid.innerHTML = "";

    }

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

let editingItemId = null;
let myReports = [];

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

                <button onclick="viewItem('${escapeHTML(item.id)}')">
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

function goToSearch() {
    document.getElementById("items").scrollIntoView({
        behavior: "smooth"
    });

    setTimeout(() => {
        document.getElementById("searchInput").focus();
    }, 500);
}

function goToMatches() {
    if (!currentUser) {
        alert("Please log in to view your possible matches.");
        openAuthModal("login");
        return;
    }

    document.getElementById("possible-matches").scrollIntoView({
        behavior: "smooth"
    });
}

function goToRecovery() {
    if (!currentUser) {
        alert("Please log in to continue with item recovery.");
        openAuthModal("login");
        return;
    }

    document.getElementById("possible-matches").scrollIntoView({
        behavior: "smooth"
    });
}




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

    // Reset editing mode
    editingItemId = null;

    const form = document.getElementById("reportForm");
    form.reset();

    document.getElementById("imagePreview").style.display = "none";

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.textContent = "Submit Report";

    const modal = document.getElementById("reportModal");

    document.getElementById("reportType").value = type;

    document.getElementById("modalTitle").textContent =
        type === "lost"
            ? "Report a Lost Item"
            : "Report a Found Item";

    modal.classList.add("show");
}


function editReport(id) {

    const item = myReports.find(report => report.id === id);

    if (!item) {
        alert("Report not found.");
        return;
    }

    editingItemId = item.id;

    // Fill existing form fields
    document.getElementById("reportType").value = item.item_type;
    document.getElementById("itemName").value = item.item_name;
    document.getElementById("itemCategory").value = item.category;
    document.getElementById("itemDescription").value = item.description;
    document.getElementById("itemLocation").value = item.location;
    document.getElementById("itemDate").value = item.item_date || "";

    // Display existing image
    const preview = document.getElementById("imagePreview");

    if (item.image_url) {
        preview.src = item.image_url;
        preview.style.display = "block";
    } else {
        preview.style.display = "none";
    }

    // Change modal heading and button
    document.getElementById("modalTitle").textContent = "Edit Report";

    document.querySelector('#reportForm button[type="submit"]')
        .textContent = "Save Changes";

    // Open existing modal
    document.getElementById("reportModal").classList.add("show");
}

async function deleteReport(id) {

    // Find the report
    const item = myReports.find(report => report.id === id);

    if (!item) {
        alert("Report not found.");
        return;
    }

    // Ask for confirmation
    const confirmDelete = confirm(
        `Are you sure you want to delete "${item.item_name}"?`
    );

    if (!confirmDelete) {
        return;
    }

    try {

        // Delete report from Supabase database
        const { error } = await supabaseClient
            .from("items")
            .delete()
            .eq("id", id)
            .eq("user_id", currentUser.id);

        if (error) {
            throw error;
        }

        // Delete uploaded image from Storage
        if (item.image_url) {

            try {
                const imagePath = decodeURIComponent(
                    new URL(item.image_url).pathname.split(
                        "/item-images/"
                    )[1] || ""
                );

                if (imagePath) {
                    const { error: imageError } =
                        await supabaseClient.storage
                            .from("item-images")
                            .remove([imagePath]);

                    if (imageError) {
                        console.warn(
                            "Image deletion failed:",
                            imageError
                        );
                    }
                }

            } catch (imageError) {
                console.warn(
                    "Could not delete image:",
                    imageError
                );
            }
        }

        // Refresh both sections
        await loadItemsFromSupabase();
        await loadMyReports();
        await findPossibleMatches();
        await loadPossibleMatches();

        alert("Report deleted successfully!");

    } catch (error) {

        console.error("Delete report error:", error);

        alert("Could not delete report: " + error.message);
    }
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
        openAuthModal("login");
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

    const isEditing = editingItemId !== null;

    const submitButton = this.querySelector(
        'button[type="submit"]'
    );

    submitButton.disabled = true;
    submitButton.textContent = isEditing
        ? "Saving Changes..."
        : "Submitting...";

    let imageURL = null;
    let imagePath = null;

    try {

        // Find existing report when editing
        const oldItem = isEditing
            ? myReports.find(item => item.id === editingItemId)
            : null;

        if (isEditing && !oldItem) {
            throw new Error("Report not found.");
        }

        // STEP 1: Upload new image if selected
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

            if (uploadError) throw uploadError;

            const { data: publicData } =
                supabaseClient.storage
                    .from("item-images")
                    .getPublicUrl(uploadData.path);

            imageURL = publicData.publicUrl;

        } else if (isEditing) {

            // Keep existing image if no new image is selected
            imageURL = oldItem.image_url;

        }

        // STEP 2: Prepare report details
        const updatedItem = {

            item_name: document.getElementById("itemName").value.trim(),

            category: document.getElementById("itemCategory").value,

            item_type: document.getElementById("reportType").value,

            description: document.getElementById("itemDescription").value.trim(),

            location: document.getElementById("itemLocation").value.trim(),

            item_date: document.getElementById("itemDate").value || null,

            image_url: imageURL

        };

        let data;
        let error;

        // STEP 3: Update existing report OR insert new report
        if (isEditing) {

            const result = await supabaseClient
                .from("items")
                .update(updatedItem)
                .eq("id", editingItemId)
                .eq("user_id", currentUser.id)
                .select()
                .single();

            data = result.data;
            error = result.error;

        } else {

            const result = await supabaseClient
                .from("items")
                .insert([{
                    ...updatedItem,
                    user_id: currentUser.id,
                    status: "active"
                }])
                .select()
                .single();

            data = result.data;
            error = result.error;

        }

        if (error) throw error;

        // STEP 4: Remove old image after successful replacement
        if (isEditing && file && oldItem.image_url) {

            try {

                const oldImagePath = decodeURIComponent(
                    new URL(oldItem.image_url).pathname.split(
                        "/item-images/"
                    )[1] || ""
                );

                if (oldImagePath) {
                    const { error: removeError } =
                        await supabaseClient.storage
                            .from("item-images")
                            .remove([oldImagePath]);

                    if (removeError) {
                        console.warn(
                            "Old image could not be removed:",
                            removeError
                        );
                    }
                }

            } catch (imageError) {
                console.warn(
                    "Could not remove old image:",
                    imageError
                );
            }
        }

        // STEP 5: Refresh website data
        editingItemId = null;

        await loadItemsFromSupabase();
        await loadMyReports();

        // Reset form
        this.reset();

        document.getElementById("imagePreview").style.display = "none";

        closeModal();

        alert(isEditing
            ? "Your report has been updated successfully!"
            : "Your report and image have been saved successfully!"
        );

    } catch (error) {

        console.error("Report submission error:", error);

        // Remove newly uploaded image if saving failed
        if (imagePath) {
            await supabaseClient.storage
                .from("item-images")
                .remove([imagePath]);
        }

        alert("Could not save report: " + error.message);

    } finally {

        submitButton.disabled = false;

        submitButton.textContent = editingItemId !== null
            ? "Save Changes"
            : "Submit Report";

    }

});


// ==========================================
// VIEW ITEM DETAILS
// ==========================================


function viewItem(id) {

    const item = items.find(item => String(item.id) === String(id));

    if (!item) {
        alert("Item details could not be found.");
        return;
    }

    // Create popup if it doesn't already exist
    let modal = document.getElementById("itemDetailsModal");

    if (!modal) {
        modal = document.createElement("div");
        modal.id = "itemDetailsModal";
        modal.className = "item-details-overlay";
        document.body.appendChild(modal);
    }

    const canClaim =
        item.type === "found" &&
        (!currentUser || item.user_id !== currentUser.id);

    modal.innerHTML = `
        <div class="item-details-box">

            <button class="item-details-close"
                id="closeItemDetails">×</button>

            <img
                id="detailsItemImage"
                src="${escapeHTML(item.image || "")}"
                alt="${escapeHTML(item.name)}"
                class="details-item-image"
            >

            <div class="details-item-content">

                <span class="item-badge ${item.type}-badge">
                    ${escapeHTML(item.type.toUpperCase())} ITEM
                </span>

                <h2>${escapeHTML(item.name)}</h2>

                <p><strong>Category:</strong>
                    ${escapeHTML(item.category || "Not specified")}
                </p>

                <p><strong>Location:</strong>
                    📍 ${escapeHTML(item.location || "Not specified")}
                </p>

                <p><strong>Date:</strong>
                    📅 ${escapeHTML(item.date || "Not specified")}
                </p>

                <div class="details-description">
                    <strong>Description</strong>
                    <p>${escapeHTML(item.description || "No description provided.")}</p>
                </div>

                ${canClaim ? `
                    <button class="details-claim-button" id="detailsClaimButton">
                        Claim This Item →
                    </button>
                ` : ""}

            </div>
        </div>
    `;

    modal.style.display = "flex";

    // Hide image if unavailable
    const detailsImage = document.getElementById("detailsItemImage");

    if (!item.image) {
        detailsImage.style.display = "none";
    }

    detailsImage.onerror = function () {
        this.style.display = "none";
    };

    // Close popup
    document.getElementById("closeItemDetails").onclick = function () {
        modal.style.display = "none";
    };

    // Close when clicking outside the popup
    modal.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    };

    // Connect claim button to existing claim system
    const claimButton = document.getElementById("detailsClaimButton");

    if (claimButton) {
        claimButton.onclick = function () {
            modal.style.display = "none";
            submitClaim(item.id, item.user_id);
        };
    }
}



// ==========================================
// UPDATE STATISTICS
// ==========================================



async function updateStats() {

    // Lost reports
    document.getElementById("lostCount").textContent =
        items.filter(item => item.type === "lost").length;

    // Found reports
    document.getElementById("foundCount").textContent =
        items.filter(item => item.type === "found").length;

    // Potential matches
    const { count: matchCount, error: matchError } =
        await supabaseClient
            .from("matches")
            .select("*", { count: "exact", head: true });

    if (matchError) {
        console.error("Match count error:", matchError);
    } else {
        document.getElementById("matchCount").textContent =
            matchCount ?? 0;
    }

    // Recovered items
    const { count: recoveredCount, error: recoveredError } =
        await supabaseClient
            .from("items")
            .select("*", { count: "exact", head: true })
            .eq("status", "resolved");

    if (recoveredError) {
        console.error("Recovered count error:", recoveredError);
    } else {
        document.getElementById("recoveredCount").textContent =
            recoveredCount ?? 0;
    }
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
        user_id: row.user_id,
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


loadItemsFromSupabase();


async function loadMyReports() {
    const grid = document.getElementById("myReportsGrid");
    const emptyMessage = document.getElementById("myReportsEmpty");

    if (!grid || !emptyMessage) return;

    if (!currentUser) {
        grid.innerHTML = "";
        myReports = [];
        return;
    }

    const { data, error } = await supabaseClient
        .from("items")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error loading My Reports:", error);
        emptyMessage.textContent = "Unable to load your reports.";
        emptyMessage.style.display = "block";
        return;
    }

    myReports = data;

    grid.innerHTML = data.map(item => `
        <article class="item-card">

            ${item.image_url ? `
                <img class="item-image"
                    src="${escapeHTML(item.image_url)}"
                    alt="${escapeHTML(item.item_name)}">
            ` : ""}

            <div class="item-info">

                <span class="item-badge ${escapeHTML(item.item_type)}-badge">
                    ${escapeHTML(item.item_type.toUpperCase())} ITEM
                </span>

                <h3>${escapeHTML(item.item_name)}</h3>
                <p>📍 ${escapeHTML(item.location)}</p>
                <p>📅 ${escapeHTML(item.item_date || "")}</p>
                <p>${escapeHTML(item.description)}</p>
                <p>Status: ${escapeHTML(item.status)}</p>

                <button type="button"
    class="delete-btn"
    onclick="deleteReport('${item.id}')">
    Delete Report
</button>

            </div>
        </article>
    `).join("");

    emptyMessage.style.display = data.length ? "none" : "block";
}


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

// ==========================================
// FINDIT AI - ITEM MATCHING ENGINE
// ==========================================

function calculateSimilarity(lostItem, foundItem) {

    let score = 0;

    // Convert text to lowercase
    const lostName = lostItem.item_name.toLowerCase();
    const foundName = foundItem.item_name.toLowerCase();

    const lostDescription = lostItem.description.toLowerCase();
    const foundDescription = foundItem.description.toLowerCase();

    const lostLocation = lostItem.location.toLowerCase();
    const foundLocation = foundItem.location.toLowerCase();

    // 1. Compare item names (30 points)
    if (lostName === foundName) {
        score += 30;
    } else if (
        lostName.includes(foundName) ||
        foundName.includes(lostName)
    ) {
        score += 20;
    }

    // 2. Compare categories (20 points)
    if (lostItem.category === foundItem.category) {
        score += 20;
    }

    // 3. Compare descriptions (30 points)
    const lostWords = lostDescription.split(/\s+/);
    const foundWords = foundDescription.split(/\s+/);

    const commonWords = lostWords.filter(word =>
        word.length > 2 && foundWords.includes(word)
    );

    const descriptionScore =
        Math.min(commonWords.length * 5, 30);

    score += descriptionScore;

    // 4. Compare locations (10 points)
    if (
        lostLocation === foundLocation ||
        lostLocation.includes(foundLocation) ||
        foundLocation.includes(lostLocation)
    ) {
        score += 10;
    }

    // 5. Compare dates (10 points)
    if (lostItem.item_date && foundItem.item_date) {

        const lostDate = new Date(lostItem.item_date);
        const foundDate = new Date(foundItem.item_date);

        const difference = Math.abs(
            lostDate - foundDate
        ) / (1000 * 60 * 60 * 24);

        if (difference <= 3) {
            score += 10;
        } else if (difference <= 7) {
            score += 5;
        }
    }

    return Math.min(score, 100);
}

// ==========================================
// FINDIT AI - FIND POSSIBLE MATCHES
// ==========================================

async function findPossibleMatches() {

    try {

        // Get active lost reports
        const { data: lostItems, error: lostError } =
            await supabaseClient
                .from("items")
                .select("*")
                .eq("item_type", "lost")
                .eq("status", "active");

        if (lostError) throw lostError;

        // Get active found reports
        const { data: foundItems, error: foundError } =
            await supabaseClient
                .from("items")
                .select("*")
                .eq("item_type", "found")
                .eq("status", "active");

        if (foundError) throw foundError;

        // Compare lost and found reports
        for (const lostItem of lostItems) {

            for (const foundItem of foundItems) {

                // Do not match a user's report with their own report
              // Only process matches involving the logged-in user's reports
if (
    lostItem.user_id !== currentUser.id &&
    foundItem.user_id !== currentUser.id
) {
    continue;
}

// Do not match a user's report with their own report
if (lostItem.user_id === foundItem.user_id) {
    continue;
}

                const score = calculateSimilarity(
                    lostItem,
                    foundItem
                );

                // Save only promising matches
                if (score >= 50) {

                    const { error: matchError } =
                        await supabaseClient
                            .from("matches")
                            .upsert([{
                                lost_item_id: lostItem.id,
                                found_item_id: foundItem.id,
                                similarity_score: score,
                                status: "pending"
                            }], {
                                onConflict: "lost_item_id,found_item_id"
                            });

                    if (matchError) {
                        console.error(
                            "Could not save match:",
                            matchError
                        );
                    }
                }
            }
        }

        console.log("Matching process completed!");

    } catch (error) {

        console.error("Matching error:", error);

    }
}

// ==========================================
// FINDIT AI - LOAD POSSIBLE MATCHES
// ==========================================

async function loadPossibleMatches() {

    const grid = document.getElementById("matchesGrid");
    const emptyMessage = document.getElementById("matchesEmpty");

    if (!grid || !emptyMessage || !currentUser) return;

    try {

        // STEP 1: Get matches from Supabase
        const { data: matches, error } = await supabaseClient
            .from("matches")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        // No matches found
        if (!matches || matches.length === 0) {
            grid.innerHTML = "";
            emptyMessage.style.display = "block";
            return;
        }

        // STEP 2: Collect item IDs
        const itemIds = [
            ...new Set(
                matches.flatMap(match => [
                    match.lost_item_id,
                    match.found_item_id
                ])
            )
        ];

        // STEP 3: Get the corresponding item details
        const { data: relatedItems, error: itemError } =
            await supabaseClient
                .from("items")
                .select("*")
                .in("id", itemIds);

        if (itemError) throw itemError;

        // STEP 4: Display matches
        grid.innerHTML = matches.map(match => {

            const lostItem = relatedItems.find(
                item => item.id === match.lost_item_id
            );

            const foundItem = relatedItems.find(
                item => item.id === match.found_item_id
            );

            if (!lostItem || !foundItem) return "";

            return `
                <article class="item-card">

                    <div class="item-info">

                        <span class="item-badge">
                            POSSIBLE MATCH
                        </span>

                        <h3>${escapeHTML(lostItem.item_name)}
                            ↔ ${escapeHTML(foundItem.item_name)}
                        </h3>

                        <p><strong>Lost item:</strong>
                            ${escapeHTML(lostItem.location)}
                        </p>

                        <p><strong>Found item:</strong>
                            ${escapeHTML(foundItem.location)}
                        </p>

                        <p><strong>Lost description:</strong>
                            ${escapeHTML(lostItem.description)}
                        </p>

                        <p><strong>Found description:</strong>
                            ${escapeHTML(foundItem.description)}
                        </p>

                        <h3>
                            Similarity: ${Number(match.similarity_score)}%
                        </h3>

                        <p>Status: ${escapeHTML(match.status)}</p>

${lostItem.user_id === currentUser.id ? `
    <button type="button"
        class="primary-btn"
        onclick="submitClaim('${foundItem.id}', '${foundItem.user_id}')">
        Claim This Item
    </button>
` : ""}


<div class="match-actions">

    <button type="button"
        class="primary-btn"
        onclick="updateMatchStatus('${match.id}', 'confirmed')">
        Confirm Match
    </button>

    <button type="button"
        class="delete-btn"
        onclick="updateMatchStatus('${match.id}', 'rejected')">
        Reject Match
    </button>

</div>

                    </div>

                </article>
            `;

        }).join("");

        emptyMessage.style.display =
            grid.innerHTML.trim() ? "none" : "block";

    } catch (error) {

        console.error("Error loading possible matches:", error);

        emptyMessage.textContent =
            "Unable to load possible matches.";

        emptyMessage.style.display = "block";

    }
}

// ==========================================
// FINDIT AI - UPDATE MATCH STATUS
// ==========================================

async function updateMatchStatus(matchId, newStatus) {

    if (!currentUser) {
        alert("Please log in first.");
        return;
    }

    if (!["confirmed", "rejected"].includes(newStatus)) {
        return;
    }

    try {

        // Update match status in Supabase
        const { error } = await supabaseClient
            .from("matches")
            .update({ status: newStatus })
            .eq("id", matchId);

        if (error) throw error;

        // Refresh possible matches
        await loadPossibleMatches();

        alert(
            newStatus === "confirmed"
                ? "Match confirmed successfully!"
                : "Match rejected successfully!"
        );

    } catch (error) {

        console.error("Match update error:", error);

        alert("Could not update match: " + error.message);

    }
}


// ==========================================
// FINDIT AI - SUBMIT ITEM CLAIM
// ==========================================


async function submitClaim(itemId, ownerId) {

    if (!currentUser) {
        alert("Please log in first.");
        return;
    }

    const message = prompt(
        "Why do you believe this item belongs to you?"
    );

    if (message === null) return;

    if (!message.trim()) {
        alert("Please enter a claim message.");
        return;
    }

    try {

        // Step 1: Submit the claim
        const { data: newClaim, error } = await supabaseClient
            .from("claims")
            .insert([{
                item_id: itemId,
                claimant_id: currentUser.id,
                owner_id: ownerId,
                message: message.trim(),
                status: "pending"
            }])
            .select("id")
            .single();

        if (error) throw error;

        // Step 2: Notify the item owner
        const { error: notificationError } = await supabaseClient
            .from("notifications")
            .insert([{
                recipient_id: ownerId,
                actor_id: currentUser.id,
                type: "claim_submitted",
                message: "Someone has submitted a claim for your found item.",
                related_item_id: itemId,
                related_claim_id: newClaim.id
            }]);

        if (notificationError) {
            console.error(
                "Notification error:",
                notificationError
            );

            alert(
                "Your claim was submitted, but the notification could not be sent."
            );

            return;
        }

        alert(
            "Your claim request has been submitted successfully!"
        );

    } catch (error) {

        console.error("Claim submission error:", error);

        alert("Could not submit claim: " + error.message);

    }
}

// ==========================================
// FINDIT AI - LOAD CLAIM REQUESTS
// ==========================================

async function loadClaims() {

    const grid = document.getElementById("claimsGrid");
    const emptyMessage = document.getElementById("claimsEmpty");

    if (!grid || !emptyMessage || !currentUser) return;

    try {

        // Get claims received by the logged-in owner
        const { data: claims, error } = await supabaseClient
            .from("claims")
            .select("*")
            .eq("owner_id", currentUser.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        if (!claims || claims.length === 0) {
            grid.innerHTML = "";
            emptyMessage.style.display = "block";
            return;
        }

        // Get details of the claimed items
        const itemIds = [
            ...new Set(claims.map(claim => claim.item_id))
        ];

        const { data: relatedItems, error: itemError } =
            await supabaseClient
                .from("items")
                .select("*")
                .in("id", itemIds);

        if (itemError) throw itemError;

        // Display claim requests
        grid.innerHTML = claims.map(claim => {

            const item = relatedItems.find(
                report => report.id === claim.item_id
            );

            if (!item) return "";

            return `
                <article class="item-card">
                    <div class="item-info">

                        <span class="item-badge">
                            CLAIM REQUEST
                        </span>

                        <h3>${escapeHTML(item.item_name)}</h3>

                        <p>
                            <strong>Claimant ID:</strong>
                            ${escapeHTML(claim.claimant_id)}
                        </p>

                        <p>
                            <strong>Message:</strong>
                            ${escapeHTML(claim.message || "")}
                        </p>

                        <p>
                            <strong>Status:</strong>
                            ${escapeHTML(claim.status)}
                        </p>

${claim.status === "pending" ? `
    <div class="match-actions">

        <button type="button"
            class="primary-btn"
            onclick="updateClaimStatus('${claim.id}', 'approved')">
            Approve Claim
        </button>

        <button type="button"
            class="delete-btn"
            onclick="updateClaimStatus('${claim.id}', 'rejected')">
            Reject Claim
        </button>

    </div>
` : ""}


                    </div>
                </article>
            `;

        }).join("");

        emptyMessage.style.display =
            grid.innerHTML.trim() ? "none" : "block";

    } catch (error) {

        console.error("Error loading claims:", error);

        emptyMessage.textContent =
            "Unable to load claim requests.";

        emptyMessage.style.display = "block";
    }
}


// ==========================================
// FINDIT AI - UPDATE CLAIM STATUS
// ==========================================

async function updateClaimStatus(claimId, newStatus) {

    if (!currentUser) {
        alert("Please log in first.");
        return;
    }

    if (!["approved", "rejected"].includes(newStatus)) {
        return;
    }

    const confirmAction = confirm(
        newStatus === "approved"
            ? "Are you sure you want to approve this claim?"
            : "Are you sure you want to reject this claim?"
    );

    if (!confirmAction) return;

    try {

        const { error } = await supabaseClient
            .from("claims")
            .update({ status: newStatus })
            .eq("id", claimId)
            .eq("owner_id", currentUser.id);

        if (error) throw error;

        await loadClaims();

        alert(
            newStatus === "approved"
                ? "Claim approved successfully!"
                : "Claim rejected successfully!"
        );

    } catch (error) {

        console.error("Claim update error:", error);

        alert("Could not update claim: " + error.message);

    }
}

// ==========================================
// FINDIT AI - LOAD APPROVED CHAT CLAIMS
// ==========================================

async function loadChatClaims() {

    const select = document.getElementById("chatClaimSelect");

    if (!select || !currentUser) return;

    try {

        const { data: claims, error } = await supabaseClient
            .from("claims")
            .select("*")
            .eq("status", "approved")
            .or(
                `claimant_id.eq.${currentUser.id},owner_id.eq.${currentUser.id}`
            );

        if (error) throw error;

        select.innerHTML =
            '<option value="">Select a conversation</option>';

        if (!claims || claims.length === 0) return;

        const itemIds = [...new Set(
            claims.map(claim => claim.item_id)
        )];

        const { data: relatedItems, error: itemError } =
            await supabaseClient
                .from("items")
                .select("id, item_name")
                .in("id", itemIds);

        if (itemError) throw itemError;

        claims.forEach(claim => {

            const item = relatedItems.find(
                report => report.id === claim.item_id
            );

            if (!item) return;

            const option = document.createElement("option");

            option.value = claim.id;
            option.textContent = item.item_name;

            select.appendChild(option);

        });

select.onchange = function() {

    if (this.value) {

        loadChatMessages(this.value);

        subscribeToChat(this.value);

    } else {

        document.getElementById("chatMessages").innerHTML =
            "<p>Select an approved claim to start chatting.</p>";

        if (chatSubscription) {
            supabaseClient.removeChannel(chatSubscription);
            chatSubscription = null;
        }

    }

};


    } catch (error) {

        console.error("Error loading chat claims:", error);

    }
}

// ==========================================
// FINDIT AI - LOAD CHAT MESSAGES
// ==========================================

async function loadChatMessages(claimId) {

    const chatBox = document.getElementById("chatMessages");

    if (!chatBox || !currentUser) return;

    try {

        const { data: messages, error } = await supabaseClient
            .from("messages")
            .select("*")
            .eq("claim_id", claimId)
            .order("created_at", { ascending: true });

        if (error) throw error;

        if (!messages || messages.length === 0) {
            chatBox.innerHTML = "<p>No messages yet. Start the conversation!</p>";
            return;
        }

        chatBox.innerHTML = messages.map(message => {

            const isMine = message.sender_id === currentUser.id;

            return `
                <div class="chat-message ${isMine ? "my-message" : "other-message"}">
                        <strong>${isMine ? "You" : "Other User"}</strong>
                    </div>

                    <p>${escapeHTML(message.message)}</p>

                    <small>
                        ${new Date(message.created_at).toLocaleString()}
                    </small>

                </div>
            `;

        }).join("");

    } catch (error) {

        console.error("Error loading messages:", error);

        chatBox.innerHTML = "<p>Unable to load messages.</p>";

    }
}

 // ==========================================
 // FINDIT AI - SEND CHAT MESSAGES
 // ==========================================

 document.getElementById("chatForm")
     .addEventListener("submit", async function(event) {

     event.preventDefault();

     if (!currentUser) {
         alert("Please log in first.");
         return;
     }

     const claimId = document.getElementById("chatClaimSelect").value;

     const input = document.getElementById("chatInput");
     const messageText = input.value.trim();

     if (!claimId) {
         alert("Please select an approved claim.");
         return;
     }

     if (!messageText) return;

     try {

         const { error } = await supabaseClient
             .from("messages")
             .insert([{
                 claim_id: claimId,
                 sender_id: currentUser.id,
                 message: messageText
             }]);

         if (error) throw error;

         input.value = "";

         await loadChatMessages(claimId);

     } catch (error) {

         console.error("Error sending message:", error);

         alert("Unable to send message. Please try again.");

     }

 });


// ==========================================
// FINDIT AI - REALTIME CHAT UPDATES
// ==========================================

let chatSubscription = null;

function subscribeToChat(claimId) {

    // Remove previous subscription
    if (chatSubscription) {
        supabaseClient.removeChannel(chatSubscription);
        chatSubscription = null;
    }

    if (!claimId || !currentUser) return;

    chatSubscription = supabaseClient
        .channel("chat-" + claimId)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "messages",
                filter: "claim_id=eq." + claimId
            },
            (payload) => {

                loadChatMessages(claimId);

            }
        )
        .subscribe();

}

// ==========================================
// FINDIT AI - LOAD NOTIFICATIONS
// ==========================================


async function loadNotifications() {

    if (!currentUser) return;

    const notificationList = document.getElementById("notificationList");
    const notificationCount = document.getElementById("notificationCount");

    try {

        const { data: notifications, error } = await supabaseClient
            .from("notifications")
            .select("*")
            .eq("recipient_id", currentUser.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        const unreadCount = notifications.filter(
            notification => !notification.is_read
        ).length;

        notificationCount.textContent = unreadCount;

        notificationCount.style.display =
            unreadCount === 0 ? "none" : "flex";

        if (notifications.length === 0) {

            notificationList.innerHTML =
                "<p>No notifications yet.</p>";

            return;
        }

        notificationList.innerHTML = notifications.map(notification => {

            return `
                <div class="notification-item ${notification.is_read ? "" : "unread"}"
                    onclick="markNotificationRead('${notification.id}')"
                    style="cursor: pointer;">

                    <p>${escapeHTML(notification.message)}</p>

                    <small>
                        ${new Date(notification.created_at).toLocaleString()}
                    </small>

                    ${notification.is_read ? "" : "<small> • Unread</small>"}

                </div>
            `;

        }).join("");

    } catch (error) {

        console.error("Error loading notifications:", error);

    }
}


// ==========================================
// MARK NOTIFICATION AS READ
// ==========================================

async function markNotificationRead(notificationId) {

    try {

        const { error } = await supabaseClient
            .from("notifications")
            .update({ is_read: true })
            .eq("id", notificationId)
            .eq("recipient_id", currentUser.id);

        if (error) throw error;

        await loadNotifications();

    } catch (error) {

        console.error("Error marking notification as read:", error);

    }
}


// ==========================================
// TOGGLE NOTIFICATION PANEL
// ==========================================

function toggleNotifications() {

    const panel = document.getElementById("notificationPanel");

    if (panel.style.display === "none") {

        panel.style.display = "block";
        loadNotifications();

    } else {

        panel.style.display = "none";

    }
}

// ==========================================
// FINDIT AI - REALTIME NOTIFICATIONS
// ==========================================

function subscribeToNotifications() {

    // Remove previous subscription
    if (notificationSubscription) {
        supabaseClient.removeChannel(notificationSubscription);
        notificationSubscription = null;
    }

    if (!currentUser) return;

    notificationSubscription = supabaseClient
        .channel("notifications-" + currentUser.id)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "notifications",
                filter: "recipient_id=eq." + currentUser.id
            },
            (payload) => {
                console.log("New notification:", payload.new);

                loadNotifications();
            }
        )
        .subscribe();
}

