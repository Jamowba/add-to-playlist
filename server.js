const express = require("express");
const request = require("request");
const querystring = require("querystring");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.static("public")); // Serve the overlay page

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
      const line = csvData.split("\n")[0].trim();
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

        const track_id = data.tracks.items[0].id;

        // Step 3: Add track to viewer's Liked Songs
        const likeOptions = {
          url: `https://api.spotify.com/v1/me/tracks?ids=${track_id}`,
          method: "PUT",
          headers: { Authorization: "Bearer " + access_token },
          json: true,
        };

        request.put(likeOptions, (err, resp, body) => {
          res.send(`<h2>✅ "${artist} - ${title}" added to your Liked Songs!</h2>`);
        });
      });
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

