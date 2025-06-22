
import { useEffect, useState } from "react";
import {
  Container,
  Card,
  Row,
  Col,
  ListGroup,
  Spinner,
  Alert,
  Image,
  Button,
  Form,
} from "react-bootstrap";
import { FaUser, FaBookmark, FaUserFriends, FaPenFancy } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

type Review = {
  _id: string;
  movieId: string;
  rating: number;
  comment: string;
};

type MovieInfo = {
  imdbID: string;
  Title: string;
  Poster: string;
};

const ProfilePage = () => {
  const { user, setUser } = useAuth();
  const [bookmarkedMovies, setBookmarkedMovies] = useState<string[]>([]);
  const [movieDetails, setMovieDetails] = useState<Record<string, MovieInfo>>({});
  const [reviews, setReviews] = useState<Review[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!user) return;

    setFormData({ username: user.username, email: user.email, password: "" });

    const fetchProfileData = async () => {
      try {
        const userRes = await fetch(`http://localhost:4000/api/users/${user._id}`);
        const userData = await userRes.json();
        const bookmarks = userData.bookmarks || [];
        setBookmarkedMovies(bookmarks);
        setFollowing(userData.following || []);

        const reviewsRes = await fetch(`http://localhost:4000/api/reviews?userId=${user._id}`);
        const reviewsData = await reviewsRes.json();
        setReviews(reviewsData);

        const allMovieIds = [...new Set([...bookmarks, ...reviewsData.map((r: Review) => r.movieId)])];
        const movieInfo: Record<string, MovieInfo> = {};

        await Promise.all(
          allMovieIds.map(async (id: string) => {
            try {
              const res = await fetch(`https://www.omdbapi.com/?i=${id}&apikey=446aabf2`);
              const data = await res.json();
              if (data.Response === "True") {
                movieInfo[id] = {
                  imdbID: id,
                  Title: data.Title,
                  Poster: data.Poster !== "N/A" ? data.Poster : "",
                };
              }
            } catch {
              movieInfo[id] = {
                imdbID: id,
                Title: "Unknown",
                Poster: "",
              };
            }
          })
        );

        setMovieDetails(movieInfo);
      } catch {
        setError("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;

    try {
      const res = await fetch(`http://localhost:4000/api/reviews/${reviewId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Failed to delete review.");
        return;
      }

      setReviews((prev) => prev.filter((r) => r._id !== reviewId));
    } catch {
      alert("Something went wrong.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");

    try {
      const res = await fetch("http://localhost:4000/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Failed to update user.");
        return;
      }

      const updatedUser = await res.json();
      setUser(updatedUser);
      setSuccessMessage("Profile updated!");
      setFormData((prev) => ({ ...prev, password: "" }));
    } catch {
      alert("Something went wrong.");
    }
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error || !user) {
    return (
      <Container className="text-center mt-5">
        <Alert variant="danger">{error || "User not found."}</Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <h2 className="mb-4 text-center">
        <FaUser className="me-2" /> My Profile
      </h2>

      <Card className="mb-4 p-3">
        <Card.Body>
          <Form onSubmit={handleUpdate}>
            <Form.Group className="mb-2">
              <Form.Label>Username</Form.Label>
              <Form.Control
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Email</Form.Label>
              <Form.Control
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>New Password (optional)</Form.Label>
              <Form.Control
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
              />
            </Form.Group>
            <Button type="submit" variant="primary">Update Profile</Button>
          </Form>
          {successMessage && <Alert variant="success" className="mt-2">{successMessage}</Alert>}
        </Card.Body>
      </Card>

      <Row>
        <Col md={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <FaBookmark className="me-2" />
              Bookmarked Movies
            </Card.Header>
            <ListGroup variant="flush">
              {bookmarkedMovies.length === 0 ? (
                <ListGroup.Item className="bg-dark text-white">No bookmarks yet.</ListGroup.Item>
              ) : (
                bookmarkedMovies.map((id, index) => {
                  const movie = movieDetails[id];
                  return (
                    <ListGroup.Item
                      key={index}
                      className="bg-dark text-white d-flex align-items-center gap-3"
                    >
                      {movie?.Poster && (
                        <Image
                          src={movie.Poster}
                          rounded
                          style={{ width: "40px", height: "60px", objectFit: "cover" }}
                        />
                      )}
                      <a
                        href={`/details/${id}`}
                        className="text-info text-decoration-none fw-bold"
                      >
                        {movie?.Title || id}
                      </a>
                    </ListGroup.Item>
                  );
                })
              )}
            </ListGroup>
          </Card>
        </Col>

        <Col md={6} className="mb-4">
          <Card className="h-100">
            <Card.Header>
              <FaUserFriends className="me-2" />
              Following
            </Card.Header>
            <ListGroup variant="flush">
              {following.length === 0 ? (
                <ListGroup.Item className="bg-dark text-white">Not following anyone.</ListGroup.Item>
              ) : (
                following.map((f, index) => (
                  <ListGroup.Item key={index} className="bg-dark text-white">
                    <a href={`/profile/${f._id}`} className="text-decoration-none text-primary">
                      {f.username}
                    </a>
                  </ListGroup.Item>
                ))
              )}
            </ListGroup>
          </Card>
        </Col>
      </Row>

      <Card className="mb-4">
        <Card.Header>
          <FaPenFancy className="me-2" />
          My Reviews
        </Card.Header>
        <ListGroup variant="flush">
          {reviews.length > 0 ? (
            reviews.map((review, index) => {
              const movie = movieDetails[review.movieId];
              return (
                <ListGroup.Item
                  key={index}
                  className="bg-dark text-white d-flex gap-3 justify-content-between align-items-start"
                >
                  <div className="d-flex gap-3">
                    {movie?.Poster && (
                      <Image
                        src={movie.Poster}
                        rounded
                        style={{ width: "40px", height: "60px", objectFit: "cover" }}
                      />
                    )}
                    <div>
                      <a
                        href={`/details/${review.movieId}`}
                        className="text-info text-decoration-none fw-bold"
                      >
                        {movie?.Title || review.movieId}
                      </a>{" "}
                      ({review.rating}/5): {review.comment}
                    </div>
                  </div>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDeleteReview(review._id)}
                  >
                    Delete
                  </Button>
                </ListGroup.Item>
              );
            })
          ) : (
            <ListGroup.Item className="bg-dark text-white">No reviews yet.</ListGroup.Item>
          )}
        </ListGroup>
      </Card>
    </Container>
  );
};

export default ProfilePage;
