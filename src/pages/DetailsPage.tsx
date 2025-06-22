
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, Container, Form, Button, Spinner, Alert } from "react-bootstrap";
import { FaBookmark, FaRegBookmark, FaStar } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

type Review = {
  _id: string;
  user: { username: string; role: string; _id: string };
  rating: number;
  comment: string;
};

type Post = {
  _id: string;
  author: { username: string; role: string; _id: string };
  content: string;
  createdAt: string;
};

const DetailsPage = () => {
  const { imdbID } = useParams();
  const { user } = useAuth();
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [postContent, setPostContent] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [postError, setPostError] = useState<string>("");
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);

  useEffect(() => {
    if (!imdbID) return;

    const fetchMovie = async () => {
      try {
        const res = await fetch(`https://www.omdbapi.com/?i=${imdbID}&apikey=446aabf2`);
        const data = await res.json();
        if (data.Response === "True") {
          setMovie(data);
        } else {
          setError("Movie not found.");
        }
      } catch {
        setError("Failed to fetch movie.");
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
    fetchReviews();
    fetchPosts();
    checkBookmark();
  }, [imdbID, user]);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/reviews/movie/${imdbID}`);
      const data = await res.json();
      setReviews(data);
    } catch {
      console.error("Failed to fetch reviews.");
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/posts/${imdbID}`);
      const data = await res.json();
      setPosts(data);
    } catch {
      console.error("Failed to fetch posts.");
    }
  };

  const checkBookmark = async () => {
    if (!user) return;
    try {
      const res = await fetch("http://localhost:4000/api/users/me", {
        credentials: "include",
      });
      const data = await res.json();
      setIsBookmarked(data.bookmarks.includes(imdbID));
    } catch {
      console.error("Failed to check bookmarks.");
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:4000/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ movieId: imdbID, rating, comment }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to post review.");
        return;
      }

      await fetchReviews();
      setRating(5);
      setComment("");
    } catch {
      setError("Something went wrong.");
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError("");

    try {
      const res = await fetch("http://localhost:4000/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ movieId: imdbID, content: postContent }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPostError(data.message || "Failed to post.");
        return;
      }

      setPosts((prev) => [...prev, data]);
      setPostContent("");
    } catch {
      setPostError("Something went wrong.");
    }
  };

  const toggleBookmark = async () => {
    if (!user) return;

    const endpoint = isBookmarked ? "remove" : "add";
    await fetch(`http://localhost:4000/api/users/bookmark/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ imdbID }),
    });

    setIsBookmarked((prev) => !prev);
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error || !movie) {
    return (
      <Container className="text-center mt-5">
        <Alert variant="danger">{error || "Movie not found."}</Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <div className="d-flex align-items-center justify-content-between">
        <h2>{movie.Title}</h2>
        {user && (
          <Button variant="link" onClick={toggleBookmark}>
            {isBookmarked ? (
              <FaBookmark color="gold" size={24} />
            ) : (
              <FaRegBookmark color="gray" size={24} />
            )}
          </Button>
        )}
      </div>

      <p><strong>Year:</strong> {movie.Year}</p>
      <p><strong>Plot:</strong> {movie.Plot}</p>
      <img src={movie.Poster} alt={movie.Title} style={{ width: "200px" }} />

      <hr />

      <h4>Reviews</h4>
      {reviews.length === 0 && <p>No reviews yet.</p>}
      {reviews.map((rev) => (
        <Card key={rev._id} className="mb-3">
          <Card.Body>
            <div className="d-flex align-items-center mb-1">
              {rev.user.role === "reviewer" && <FaStar className="text-warning me-2" />}
              <strong>
                <a href={`/profile/${rev.user._id}`} className="text-decoration-underline">
                  {rev.user.username}
                </a>
              </strong>
            </div>
            <div>
              <strong>{movie.Title}</strong> — {rev.rating}/5
            </div>
            <p>{rev.comment}</p>
          </Card.Body>
        </Card>
      ))}
      {user?.role === "reviewer" && (
        <>
          <h5 className="mt-4">Leave a Review</h5>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmitReview}>
            <Form.Group className="mb-3">
              <Form.Label>Rating (1–5)</Form.Label>
              <Form.Control
                type="number"
                min={1}
                max={5}
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Comment</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
              />
            </Form.Group>
            <Button type="submit" variant="primary">Submit Review</Button>
          </Form>
        </>
      )}

      <hr />

      <h4>Posts</h4>
      {posts.length === 0 && <p>No posts yet.</p>}
      {posts.map((post) => (
        <Card key={post._id} className="mb-3">
          <Card.Body>
            <div className="d-flex align-items-center mb-1">
              {post.author.role === "reviewer" && <FaStar className="text-warning me-2" />}
              <strong>
                <a href={`/profile/${post.author._id}`} className="text-decoration-underline">
                  {post.author.username}
                </a>
              </strong>
            </div>
            <p>{post.content}</p>
            <small>{new Date(post.createdAt).toLocaleString()}</small>
          </Card.Body>
        </Card>
      ))}

      {user && (
        <>
          <h5 className="mt-4">Create a Post</h5>
          {postError && <Alert variant="danger">{postError}</Alert>}
          <Form onSubmit={handleSubmitPost}>
            <Form.Group className="mb-3">
              <Form.Label>Content</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                required
              />
            </Form.Group>
            <Button type="submit" variant="primary">Submit Post</Button>
          </Form>
        </>
      )}
    </Container>
  );
};

export default DetailsPage;
