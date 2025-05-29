const express = require("express");
const request = require("request");
const querystring = require("querystring");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
app.use(express.static("public")); // Serve index.html from /public

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

// -------------------------
// Route: /login
// Redirects viewer to Spotify login
// -------------------------
app.get("/login", (req, res) => {
  const scope = "playlist-modify-public playlist-read-private";
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
// Handles Spotify redirect, gets access token, and playlists
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

    // 🔁 Get the viewer's playlists
    const playlistsOptions = {
      url: "https://api.spotify.com/v1/me/playlists",
      headers: { Authorization: "Bearer " + access_token },
      json: true,
    };

    request.get(playlistsOptions, (err, resp, body) => {
      const playlists = body.items;

      // 🖥️ Display viewer's playlists as links
      let html = "<h2>Select a playlist to add the song to:</h2><ul>";
      playlists.forEach((p) => {
        html += `<li><a href="/add-track?playlist_id=${p.id}&access_token=${access_token}">${p.name}</a></li>`;
      });
      html += "</ul>";
      res.send(html);
    });
  });
});

// -------------------------
// Route: /add-track
// Adds hardcoded song to selected playlist
// -------------------------
app.get("/add-track", (req, res) => {
  const { playlist_id, access_token } = req.query;

  // 💡 Replace this with Songify song later
  const track_uri = "spotify:track:4cOdK2wGLETKBW3PvgPWqT"; // Rick Astley

  const options = {
    url: `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,
    headers: { Authorization: "Bearer " + access_token },
    json: { uris: [track_uri] },
  };

  request.post(options, (err, resp, body) => {
    res.send("<h2>✅ Song added to your playlist!</h2><p>You can close this window now.</p>");
  });
});

// -------------------------
// Start server
// -------------------------
app.listen(3000, () => {
  console.log("✅ App running on http://localhost:3000");
});
