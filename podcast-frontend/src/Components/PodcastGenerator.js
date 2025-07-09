import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from '../Components/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PodcastGenerator = () => {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedPodcast, setGeneratedPodcast] = useState(null);
  const [podcastList, setPodcastList] = useState([]);
  const [error, setError] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Fetch existing podcasts
  useEffect(() => {
    fetchPodcasts();
  }, []);

  const fetchPodcasts = async () => {
    try {
      const res = await axios.get("http://localhost:5000/podcasts"); // update your backend URL
      setPodcastList(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load podcasts");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGeneratedPodcast(null);

    try {
      const res = await axios.post(
        "http://localhost:5000/generate", 
        { topic }
      );
      setGeneratedPodcast(res.data.podcast);
      // Optionally refresh podcast list
      fetchPodcasts();
    } catch (err) {
      console.error(err);
      setError("Failed to generate podcast");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/'); // Redirect to main page after logout
  };

  return (
    <div style={{ maxWidth: 800, margin: "auto", padding: 20, position: 'relative' }}>
      {user && (
        <button
          onClick={handleLogout}
          style={{ position: 'absolute', top: 20, right: 20, padding: '8px 16px', zIndex: 2 }}
        >
          Logout
        </button>
      )}
      <h2>Generate a Podcast</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter podcast topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          required
          style={{ width: "100%", padding: 8, fontSize: 16 }}
        />
        <button type="submit" disabled={loading} style={{ marginTop: 10 }}>
          {loading ? "Generating..." : "Generate"}
        </button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {generatedPodcast && (
        <div style={{ marginTop: 20, border: "1px solid #ccc", padding: 10 }}>
          <h3>{generatedPodcast.title}</h3>
          <p><strong>Topic:</strong> {generatedPodcast.topic}</p>
          <h4>📝 Script</h4>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{generatedPodcast.script}</pre>
          <h4>🔑 Bullet Points</h4>
          <ul>
            {generatedPodcast.bulletPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
          {generatedPodcast.audioUrl ? (
            <>
              <h4>🔊 Audio Preview</h4>
              <audio controls style={{ width: '100%' }}>
                <source src={`http://localhost:5000${generatedPodcast.audioUrl}`} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
              <br /><br />
              <a
                href={`http://localhost:5000${generatedPodcast.audioUrl}`}
                download
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: 6,
                  display: 'inline-block',
                }}
              >
                ⬇️ Download Full Audio
              </a>
            </>
          ) : (
            <p><em>No audio available.</em></p>
          )}
        </div>
      )}
      <hr />
      <h3>Previous Podcasts</h3>
      {podcastList.length === 0 ? (
        <p>No podcasts generated yet.</p>
      ) : (
        podcastList.map((p) => (
          <div key={p._id} style={{ border: '1px solid #ccc', padding: 16, marginBottom: 16 }}>
            <h2>{p.title}</h2>
            <p><strong>Topic:</strong> {p.topic}</p>
            <h3>📝 Script</h3>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{p.script}</pre>
            <h3>🔑 Bullet Points</h3>
            <ul>
              {p.bulletPoints.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
            {p.audioUrl ? (
              <>
                <h3>🔊 Audio Preview</h3>
                <audio controls style={{ width: '100%' }}>
                  <source src={`http://localhost:5000${p.audioUrl}`} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
                <br /><br />
                <a
                  href={`http://localhost:5000${p.audioUrl}`}
                  download
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: 6,
                    display: 'inline-block',
                  }}
                >
                  ⬇️ Download Full Audio
                </a>
              </>
            ) : (
              <p><em>No audio available.</em></p>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default PodcastGenerator;
