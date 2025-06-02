// server.js — FINAL with Retry + Fallback + Confirmation Page

const express = require("express");
const request = require("request");
const querystring = require("querystring");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.static("public")); // Serve the overlay page

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

// Your public Google Sheets CSV link
const songFileURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT_AlpEmUEy8nEvgwcF1V0Ag3q_w_pQFduW-CQuQBGLHf4io72TP-jE8KDEUWPCSwKvBNj5SfRp2cKn/pub?output=csv";

// -------------------------
// Route: /login
// -------------------------
app.get("/login", (req, res) => {
  const scope = "user-library-modify"; // For Liked Songs
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id,
        scope,
        redirect_uri,
      })
  );
});

// -------------------------
// Route: /callback
// -------------------------
app.get("/callback", (req, res) => {
  const code = req.query.code || null;
  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    form: {
      code,
      redirect_uri,
      grant_type: "authorization_code",
    },
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(client_id + ":" + client_secret).toString("base64"),
    },
    json: true,
  };

  request.post(authOptions, (error, response, body) => {
    const access_token = body.access_token;

    // Step 1: Fetch the song from the Google Sheet CSV
    request(songFileURL, (err, resp, csvData) => {
      if (err || resp.statusCode !== 200) {
        return res.send("<h2>❌ Could not fetch song from Google Sheets.</h2>");
      }

      // CSV: First row = first song
      const line = csvData.split("\n")[0].replace(/^"|"$/g, "").trim(); // Strip quotes
      if (!line.includes(" - ")) {
        return res.send("<h2>❌ Invalid song format. Must be 'Artist - Title'</h2>");
      }

      const [artistRaw, titleRaw] = line.split(" - ");

      // Handle multi-artist
      const artistParts = artistRaw.split(",").map((a) => a.trim());
      const artistQuery = artistParts.map((a) => `artist:${a}`).join(" ");

      const title = titleRaw.trim();

      function addTrackToLiked(track_id) {
        const likeOptions = {
          url: `https://api.spotify.com/v1/me/tracks?ids=${track_id}`,
          method: "PUT",
          headers: { Authorization: "Bearer " + access_token },
          json: true,
        };

        request.put(likeOptions, (err, resp, body) => {
          res.render("confirmation", { artist: artistParts.join(", "), title });
        });
      }

      function searchSpotify(searchUrl, fallback = false) {
        request.get(
          {
            url: searchUrl,
            headers: { Authorization: "Bearer " + access_token },
            json: true,
          },
          (err, resp, data) => {
            if (
              !data.tracks ||
              !data.tracks.items ||
              data.tracks.items.length === 0
            ) {
              if (!fallback) {
                // Retry SAME search after short delay
                console.log("🔄 Retrying search after delay...");
                return setTimeout(() => searchSpotify(searchUrl, true), 500);
              } else {
                // Fallback to loose search (track only)
                console.log("⚠️ Fallback to loose search...");
                const looseQuery = encodeURIComponent(`track:${title}`);
                const looseUrl = `https://api.spotify.com/v1/search?q=${looseQuery}&type=track&limit=1`;
                request.get(
                  {
                    url: looseUrl,
                    headers: { Authorization: "Bearer " + access_token },
                    json: true,
                  },
                  (err, resp, data) => {
                    if (
                      !data.tracks ||
                      !data.tracks.items ||
                      data.tracks.items.length === 0
                    ) {
                      return res.send(
                        `<h2>❌ Couldn't find "${artistParts.join(", ")} - ${title}" even after retry and fallback.</h2>`
                      );
                    } else {
                      const track_id = data.tracks.items[0].id;
                      addTrackToLiked(track_id);
                    }
                  }
                );
              }
            } else {
              const track_id = data.tracks.items[0].id;
              addTrackToLiked(track_id);
            }
          }
        );
      }

      // Initial search start
      const searchQuery = encodeURIComponent(`track:${title} ${artistQuery}`);
      const searchUrl = `https://api.spotify.com/v1/search?q=${searchQuery}&type=track&limit=1`;
      console.log("🎵 Starting Spotify search:", searchUrl);
      searchSpotify(searchUrl);
    });
  });
});

// -------------------------
// Start server
// -------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ App running on http://localhost:${PORT}`);
});
