import { Router } from "express";
import { db } from "../db";
import {
    xConnections,
    xMonitoredAccounts,
    xSavedSearches,
    intelNewsItems,
    type IntelNewsType,
    type IntelRegion
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import crypto from "crypto";

const router = Router();

// Environment variables for X API
const X_CLIENT_ID = process.env.X_CLIENT_ID || "";
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET || "";
const X_CALLBACK_URL = process.env.X_CALLBACK_URL || "http://localhost:5000/api/x/callback";

// OAuth 2.0 PKCE helpers
function generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
    return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// Store PKCE verifiers temporarily (in production, use Redis or session)
const pkceStore: Map<string, { verifier: string; state: string }> = new Map();

// ============================================
// OAUTH ROUTES
// ============================================

// GET /api/x/auth - Start OAuth flow
router.get("/auth", isAuthenticated, async (req, res) => {
    try {
        if (!X_CLIENT_ID) {
            return res.status(400).json({ message: "X API not configured. Set X_CLIENT_ID in environment." });
        }

        const state = crypto.randomBytes(16).toString("hex");
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(codeVerifier);

        // Store for callback
        const userId = (req.user as any)?.claims?.email || "unknown";
        pkceStore.set(state, { verifier: codeVerifier, state });

        const scopes = [
            "tweet.read",
            "tweet.write",
            "users.read",
            "follows.read",
            "offline.access"
        ].join(" ");

        const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("client_id", X_CLIENT_ID);
        authUrl.searchParams.set("redirect_uri", X_CALLBACK_URL);
        authUrl.searchParams.set("scope", scopes);
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("code_challenge", codeChallenge);
        authUrl.searchParams.set("code_challenge_method", "S256");

        res.json({ authUrl: authUrl.toString() });
    } catch (error) {
        console.error("Error starting X OAuth:", error);
        res.status(500).json({ message: "Failed to start OAuth flow" });
    }
});

// GET /api/x/callback - Handle OAuth callback
router.get("/callback", async (req, res) => {
    try {
        const { code, state, error } = req.query;

        if (error) {
            return res.redirect(`/settings?x_error=${error}`);
        }

        if (!code || !state) {
            return res.redirect("/settings?x_error=missing_params");
        }

        const pkceData = pkceStore.get(state as string);
        if (!pkceData) {
            return res.redirect("/settings?x_error=invalid_state");
        }

        // Exchange code for tokens
        const tokenResponse = await fetch("https://api.twitter.com/2/oauth2/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString("base64")}`,
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code: code as string,
                redirect_uri: X_CALLBACK_URL,
                code_verifier: pkceData.verifier,
            }),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error("X token exchange failed:", errorText);
            return res.redirect("/settings?x_error=token_exchange_failed");
        }

        const tokens = await tokenResponse.json();

        // Get user info
        const userResponse = await fetch("https://api.twitter.com/2/users/me", {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        const userData = userResponse.ok ? await userResponse.json() : { data: {} };

        // Save connection
        await db.insert(xConnections).values({
            xUserId: userData.data?.id,
            xUsername: userData.data?.username,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
            scopes: tokens.scope,
        });

        pkceStore.delete(state as string);

        res.redirect("/settings?x_connected=true");
    } catch (error) {
        console.error("Error in X OAuth callback:", error);
        res.redirect("/settings?x_error=callback_failed");
    }
});

// GET /api/x/status - Check connection status
router.get("/status", isAuthenticated, async (req, res) => {
    try {
        const connections = await db
            .select()
            .from(xConnections)
            .where(eq(xConnections.isActive, true))
            .limit(1);

        if (connections.length === 0) {
            return res.json({ connected: false });
        }

        const conn = connections[0];
        res.json({
            connected: true,
            username: conn.xUsername,
            expiresAt: conn.tokenExpiresAt,
        });
    } catch (error) {
        console.error("Error checking X status:", error);
        res.status(500).json({ message: "Failed to check status" });
    }
});

// ============================================
// SEARCH ROUTES
// ============================================

// GET /api/x/search - Search tweets
router.get("/search", isAuthenticated, async (req, res) => {
    try {
        const { query, maxResults = "10" } = req.query;

        if (!query) {
            return res.status(400).json({ message: "Query parameter required" });
        }

        const connections = await db
            .select()
            .from(xConnections)
            .where(eq(xConnections.isActive, true))
            .limit(1);

        if (connections.length === 0) {
            return res.status(401).json({ message: "X not connected. Go to Settings to connect." });
        }

        const conn = connections[0];

        const searchUrl = new URL("https://api.twitter.com/2/tweets/search/recent");
        searchUrl.searchParams.set("query", query as string);
        searchUrl.searchParams.set("max_results", maxResults as string);
        searchUrl.searchParams.set("tweet.fields", "created_at,author_id,public_metrics");
        searchUrl.searchParams.set("expansions", "author_id");
        searchUrl.searchParams.set("user.fields", "username,name");

        const response = await fetch(searchUrl.toString(), {
            headers: { Authorization: `Bearer ${conn.accessToken}` },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("X search failed:", errorText);
            return res.status(response.status).json({ message: "Search failed", error: errorText });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error searching X:", error);
        res.status(500).json({ message: "Failed to search" });
    }
});

// ============================================
// MONITORED ACCOUNTS
// ============================================

// GET /api/x/monitored - Get monitored accounts
router.get("/monitored", isAuthenticated, async (req, res) => {
    try {
        const accounts = await db
            .select()
            .from(xMonitoredAccounts)
            .where(eq(xMonitoredAccounts.isActive, true))
            .orderBy(desc(xMonitoredAccounts.createdAt));

        res.json(accounts);
    } catch (error) {
        console.error("Error fetching monitored accounts:", error);
        res.status(500).json({ message: "Failed to fetch accounts" });
    }
});

// POST /api/x/monitored - Add account to monitor
router.post("/monitored", isAuthenticated, async (req, res) => {
    try {
        const { xUsername, displayName, category, notes } = req.body;

        if (!xUsername) {
            return res.status(400).json({ message: "xUsername required" });
        }

        const [account] = await db.insert(xMonitoredAccounts).values({
            xUsername: xUsername.replace("@", ""),
            displayName,
            category: category || "competitor",
            notes,
        }).returning();

        res.status(201).json(account);
    } catch (error) {
        console.error("Error adding monitored account:", error);
        res.status(500).json({ message: "Failed to add account" });
    }
});

// DELETE /api/x/monitored/:id - Remove monitored account
router.delete("/monitored/:id", isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        await db.delete(xMonitoredAccounts).where(eq(xMonitoredAccounts.id, parseInt(id)));
        res.json({ success: true });
    } catch (error) {
        console.error("Error removing monitored account:", error);
        res.status(500).json({ message: "Failed to remove account" });
    }
});

// ============================================
// SAVED SEARCHES
// ============================================

// GET /api/x/searches - Get saved searches
router.get("/searches", isAuthenticated, async (req, res) => {
    try {
        const searches = await db
            .select()
            .from(xSavedSearches)
            .where(eq(xSavedSearches.isActive, true))
            .orderBy(desc(xSavedSearches.createdAt));

        res.json(searches);
    } catch (error) {
        console.error("Error fetching saved searches:", error);
        res.status(500).json({ message: "Failed to fetch searches" });
    }
});

// POST /api/x/searches - Save a search
router.post("/searches", isAuthenticated, async (req, res) => {
    try {
        const { query, category, description } = req.body;

        if (!query) {
            return res.status(400).json({ message: "Query required" });
        }

        const [search] = await db.insert(xSavedSearches).values({
            query,
            category: category || "opportunity",
            description,
        }).returning();

        res.status(201).json(search);
    } catch (error) {
        console.error("Error saving search:", error);
        res.status(500).json({ message: "Failed to save search" });
    }
});

// POST /api/x/searches/seed - Seed default hashtag searches
router.post("/searches/seed", isAuthenticated, async (req, res) => {
    try {
        const defaultSearches = [
            { query: "#ConstructionBids", category: "opportunity", description: "Construction bidding opportunities" },
            { query: "#RFP construction", category: "opportunity", description: "RFP announcements" },
            { query: "#GovContracts building", category: "opportunity", description: "Government building contracts" },
            { query: "#NYCDOB", category: "policy", description: "NYC Department of Buildings updates" },
            { query: "#OSHA construction", category: "policy", description: "OSHA construction safety" },
            { query: "#LocalLaw97", category: "policy", description: "NYC carbon emissions law" },
            { query: "#BuildingRegs", category: "policy", description: "Building regulations news" },
            { query: "#ScanToBIM", category: "industry", description: "Scan-to-BIM industry news" },
            { query: "#LaserScanning", category: "industry", description: "Laser scanning technology" },
            { query: "#AECnews", category: "industry", description: "AEC industry news" },
            { query: "#BIM", category: "industry", description: "Building Information Modeling" },
        ];

        const inserted = await db.insert(xSavedSearches).values(defaultSearches).returning();

        res.json({ success: true, count: inserted.length, searches: inserted });
    } catch (error) {
        console.error("Error seeding searches:", error);
        res.status(500).json({ message: "Failed to seed searches" });
    }
});

// ============================================
// IMPORT TO INTEL
// ============================================

// POST /api/x/import - Import a tweet as intel news item
router.post("/import", isAuthenticated, async (req, res) => {
    try {
        const { tweetId, tweetText, authorUsername, type, region } = req.body;

        if (!tweetText || !type) {
            return res.status(400).json({ message: "tweetText and type required" });
        }

        const [item] = await db.insert(intelNewsItems).values({
            type: type as IntelNewsType,
            title: tweetText.substring(0, 100) + (tweetText.length > 100 ? "..." : ""),
            summary: tweetText,
            sourceUrl: `https://x.com/${authorUsername}/status/${tweetId}`,
            sourceName: `@${authorUsername}`,
            region: region as IntelRegion | undefined,
            metadata: { tweetId, authorUsername },
            createdBy: (req.user as any)?.claims?.email || "system",
        }).returning();

        res.status(201).json(item);
    } catch (error) {
        console.error("Error importing tweet:", error);
        res.status(500).json({ message: "Failed to import tweet" });
    }
});

// ============================================
// POST TWEET
// ============================================

// POST /api/x/tweet - Post a tweet to @Scan2Plan_io
router.post("/tweet", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ message: "Tweet text required" });
        }

        if (text.length > 280) {
            return res.status(400).json({ message: "Tweet exceeds 280 characters" });
        }

        const connections = await db
            .select()
            .from(xConnections)
            .where(eq(xConnections.isActive, true))
            .limit(1);

        if (connections.length === 0) {
            return res.status(401).json({ message: "X not connected. Go to Settings to connect." });
        }

        const conn = connections[0];

        const response = await fetch("https://api.twitter.com/2/tweets", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${conn.accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("X tweet failed:", errorText);
            return res.status(response.status).json({ message: "Failed to post tweet", error: errorText });
        }

        const data = await response.json();
        res.json({ success: true, tweet: data });
    } catch (error) {
        console.error("Error posting tweet:", error);
        res.status(500).json({ message: "Failed to post tweet" });
    }
});

// ============================================
// SEED COMPETITOR ACCOUNTS
// ============================================

// POST /api/x/monitored/seed - Seed example competitor accounts
router.post("/monitored/seed", isAuthenticated, async (req, res) => {
    try {
        const competitors = [
            { xUsername: "ScanCorpUS", displayName: "ScanCorp", category: "competitor", notes: "National player" },
            { xUsername: "TechScanPro", displayName: "TechScan Pro", category: "competitor", notes: "Mid-range competitor" },
            { xUsername: "BIM360", displayName: "BIM 360", category: "competitor", notes: "Autodesk product" },
            { xUsername: "NYABOREB", displayName: "NYC Buildings", category: "regulator", notes: "NYC DOB official" },
            { xUsername: "ABOREB", displayName: "ABX", category: "industry", notes: "AEC conference" },
        ];

        const inserted = await db.insert(xMonitoredAccounts).values(competitors).returning();

        res.json({ success: true, count: inserted.length, accounts: inserted });
    } catch (error) {
        console.error("Error seeding competitors:", error);
        res.status(500).json({ message: "Failed to seed competitors" });
    }
});

export default router;
