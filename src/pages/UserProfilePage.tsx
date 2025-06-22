// src/pages/UserProfilePage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Container,
  Card,
  ListGroup,
  Spinner,
  Alert,
  Button,
  Image,
} from "react-bootstrap";
import { FaUser, FaBookmark, FaUserFriends, FaPenFancy } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

type Review = {
  _id: string;
  movieId: string;
  movieTitle: string;
  rating: number;
  comment: string;
};

type MovieInfo = {
  imdbID: string;
  Title: string;
  Poster: string;
};

const UserProfilePage = () => {
  const { user, setUser } = useAuth();
  const { userId } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [movieDetails, setMovieDetails] = useState<Record<string, MovieInfo>>({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/users/${userId}`);
        const data = await res.json();
        setProfile(data);

        if (user && data._id !== user._id) {
          setIsFollowing(user.following?.includes(data._id) ?? false);
        }

        // fetch OMDb info for bookmarks
        const movieInfo: Record<string, MovieInfo> = {};
        await Promise.all(
          (data.bookmarks || []).map(async (id: string) => {
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
        setError("Failed to load user profile.");
      } finally {
        setLoading(false);
      }
    };

    const fetchReviews = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/reviews?userId=${userId}`);
        const data = await res.json();
        setReviews(data);

        // fetch movie details for each reviewed movie
        const reviewMovieInfo: Record<string, MovieInfo> = { ...movieDetails };
        await Promise.all(
          data.map(async (review: Review) => {
            const id = review.movieId;
            if (!reviewMovieInfo[id]) {
              try {
                const res = await fetch(`https://www.omdbapi.com/?i=${id}&apikey=446aabf2`);
                const movie = await res.json();
                if (movie.Response === "True") {
                  reviewMovieInfo[id] = {
                    imdbID: id,
                    Title: movie.Title,
                    Poster: movie.Poster !== "N/A" ? movie.Poster : "",
                  };
                } else {
                  reviewMovieInfo[id] = { imdbID: id, Title: "Unknown", Poster: "" };
                }
              } catch {
                reviewMovieInfo[id] = { imdbID: id, Title: "Unknown", Poster: "" };
              }
            }
          })
        );
        setMovieDetails(reviewMovieInfo);
      } catch {
        console.error("Failed to fetch reviews for user.");
      }
    };

    if (userId) {
      fetchProfile();
      fetchReviews();
    }
  }, [userId, user]);

  const toggleFollow = async () => {
    if (!user || !profile) return;

    const endpoint = isFollowing ? "unfollow" : "follow";

    try {
      const res = await fetch(`http://localhost:4000/api/users/${endpoint}/${profile._id}`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        const updatedFollowing = isFollowing
          ? user.following?.filter((id) => id !== profile._id)
          : [...(user.following || []), profile._id];

        setUser({ ...user, following: updatedFollowing });
        setIsFollowing(!isFollowing);
      }
    } catch (err) {
      console.error("Failed to update follow status");
    }
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error || !profile) {
    return (
      <Container className="text-center mt-5">
        <Alert variant="danger">{error || "User not found."}</Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <h2 className="mb-3 text-center">
        <FaUser className="me-2" /> {profile.username}'s Profile
      </h2>

      {user && user._id !== profile._id && (
        <div className="text-center mb-3">
          <Button
            variant={isFollowing ? "secondary" : "primary"}
            onClick={toggleFollow}
          >
            {isFollowing ? "Unfollow" : "Follow"}
          </Button>
        </div>
      )}

      <Card className="mb-4 p-3">
        <Card.Body>
          <Card.Text className="text-muted">Role: {profile.role}</Card.Text>
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Header>
          <FaBookmark className="me-2" />
          Bookmarked Movies
        </Card.Header>
        <ListGroup variant="flush">
          {profile.bookmarks?.length > 0 ? (
            profile.bookmarks.map((id: string, index: number) => {
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
          ) : (
            <ListGroup.Item className="bg-dark text-white">No bookmarks yet.</ListGroup.Item>
          )}
        </ListGroup>
      </Card>

      <Card className="mb-4">
        <Card.Header>
          <FaUserFriends className="me-2" />
          Following
        </Card.Header>
        <ListGroup variant="flush">
          {profile.following?.length > 0 ? (
            profile.following.map((f: any, index: number) => (
              <ListGroup.Item key={index} className="bg-dark text-white">
                <a href={`/profile/${f._id}`} className="text-decoration-none text-primary">
                  {f.username}
                </a>
              </ListGroup.Item>
            ))
          ) : (
            <ListGroup.Item className="bg-dark text-white">No following yet.</ListGroup.Item>
          )}
        </ListGroup>
      </Card>

      <Card className="mb-4">
        <Card.Header>
          <FaPenFancy className="me-2" />
          {profile.username}'s Reviews
        </Card.Header>
        <ListGroup variant="flush">
          {reviews.length > 0 ? (
            reviews.map((review, index) => {
              const movie = movieDetails[review.movieId];
              return (
                <ListGroup.Item key={index} className="bg-dark text-white d-flex align-items-center gap-3">
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

export default UserProfilePage;
