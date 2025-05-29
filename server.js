const express = require("express");
const request = require("request");
const querystring = require("querystring");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.static("public")); // Serve index.html from /public

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

// The URL to your publicly shared output.txt file from Google Drive
const songFileURL = "https://drive.google.com/uc?export=download&id=1cxtMNTPF2QFTNVVmSnFkvdvGOKhGm3Nt";

// -------------------------
// Route: /login
// -------------------------
app.get("/login", (req, res) => {
  const scope = "playlist-modify-public";
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

    // Step 1: Get song info from your txt file
    request(songFileURL, (err, resp, songText) => {
      if (err || resp.statusCode !== 200) {
        return res.send("<h2>❌ Could not fetch song file.</h2>");
      }

      const line = songText.trim();
      if (!line.includes(" - ")) {
        return res.send("<h2>❌ Invalid song format. Must be 'Artist - Title'</h2>");
      }

      const [artist, title] = line.split(" - ");

      // Step 2: Search Spotify for the track
      const searchQuery = encodeURIComponent(`track:${title} artist:${artist}`);
      const searchUrl = `https://api.spotify.com/v1/search?q=${searchQuery}&type=track&limit=1`;

      const options = {
        url: searchUrl,
        headers: { Authorization: "Bearer " + access_token },
        json: true,
      };

      request.get(options, (err, resp, data) => {
        if (
          !data.tracks ||
          !data.tracks.items ||
          data.tracks.items.length === 0
        ) {
          return res.send(`<h2>❌ Couldn't find "${artist} - ${title}" on Spotify.</h2>`);
        }

        const track_uri = data.tracks.items[0].uri;

        // Step 3: Get the user's default playlist
        request.get(
          {
            url: "https://api.spotify.com/v1/me/playlists",
            headers: { Authorization: "Bearer " + access_token },
            json: true,
          },
          (err, resp, body) => {
            if (!body.items || body.items.length === 0) {
              return res.send("<h2>❌ No playlists found in your account.</h2>");
            }

            const playlist_id = body.items[0].id; // Use first playlist

            const addOptions = {
              url: `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,
              headers: { Authorization: "Bearer " + access_token },
              json: { uris: [track_uri] },
            };

            request.post(addOptions, (err, resp, body) => {
              res.send(`<h2>✅ "${artist} - ${title}" added to your playlist!</h2>`);
            });
          }
        );
      });
    });
  });
});

// -------------------------
// Start server
// -------------------------
app.listen(3000, () => {
  console.log("✅ App running on http://localhost:3000");
});
