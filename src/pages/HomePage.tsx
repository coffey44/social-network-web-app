
import { useEffect, useState } from "react";
import { Card, Row, Col, Container, Spinner, Alert } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { FaStar, FaUserCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

type Author = {
  _id: string;
  username: string;
  role: string;
};

type Post = {
  _id: string;
  movieId: string;
  content: string;
  createdAt: string;
  author: Author;
};

type Review = {
  _id: string;
  movieId: string;
  rating: number;
  comment: string;
  createdAt: string;
  author: Author;
};

type MovieInfo = {
  title: string;
  poster: string;
};

type MovieMap = {
  [movieId: string]: MovieInfo;
};

type Movie = {
  imdbID: string;
  Title: string;
  Year: string;
  Poster: string;
};

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [movieData, setMovieData] = useState<MovieMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);
  const [featuredUsers, setFeaturedUsers] = useState<any[]>([]);
  const [publicMovieData, setPublicMovieData] = useState<MovieMap>({});

  useEffect(() => {
    const fetchFeedData = async () => {
      try {
        const movieRes = await fetch("https://www.omdbapi.com/?apikey=446aabf2&s=superman");
        const movieData = await movieRes.json();
        if (movieData.Response === "True") {
          setRecommendedMovies(movieData.Search.slice(0, 4));
        }

        const userRes = await fetch("http://localhost:4000/api/users/all");
        const userData = await userRes.json();
        setFeaturedUsers(
          Array.isArray(userData)
            ? userData.filter((u: any) => !user || u._id !== user._id)
            : []
        );

        if (!user) {
          const reviewRes = await fetch("http://localhost:4000/api/reviews/public");
          const postRes = await fetch("http://localhost:4000/api/posts/public");

          const reviewData = await reviewRes.json();
          const postData = await postRes.json();

          setReviews(reviewData.slice(0, 3));
          setPosts(postData.slice(0, 3));

          const allIds = [...new Set([
            ...reviewData.slice(0, 3).map((r: Review) => r.movieId),
            ...postData.slice(0, 3).map((p: Post) => p.movieId),
          ])];

          const fetched: MovieMap = {};
          await Promise.all(
            allIds.map(async (id) => {
              const res = await fetch(`https://www.omdbapi.com/?i=${id}&apikey=446aabf2`);
              const data = await res.json();
              if (data.Response === "True") {
                fetched[id] = {
                  title: data.Title,
                  poster: data.Poster !== "N/A" ? data.Poster : "",
                };
              } else {
                fetched[id] = { title: id, poster: "" };
              }
            })
          );
          setPublicMovieData(fetched);
          return;
        }

        const [postRes, reviewRes] = await Promise.all([
          fetch("http://localhost:4000/api/posts/feed", { credentials: "include" }),
          fetch("http://localhost:4000/api/reviews/feed", { credentials: "include" }),
        ]);

        const postData = await postRes.json();
        const reviewData = await reviewRes.json();

        if (!postRes.ok) throw new Error(postData.message || "Failed to load posts");
        if (!reviewRes.ok) throw new Error(reviewData.message || "Failed to load reviews");

        setPosts(postData);
        setReviews(reviewData);

        const movieIds = [
          ...new Set([
            ...postData.map((p: Post) => p.movieId),
            ...reviewData.map((r: Review) => r.movieId),
          ]),
        ];

        const fetched: MovieMap = {};
        await Promise.all(
          movieIds.map(async (id) => {
            const res = await fetch(`https://www.omdbapi.com/?i=${id}&apikey=446aabf2`);
            const data = await res.json();
            if (data.Response === "True") {
              fetched[id] = {
                title: data.Title,
                poster: data.Poster !== "N/A" ? data.Poster : "",
              };
            } else {
              fetched[id] = { title: id, poster: "" };
            }
          })
        );

        setMovieData(fetched);
      } catch (err: any) {
        console.error("Feed fetch error:", err);
        setError(err.message || "Failed to load homepage");
      } finally {
        setLoading(false);
      }
    };

    fetchFeedData();
  }, [user]);

  const resolveMovie = (id: string) => movieData[id] || publicMovieData[id];

  return (
    <Container className="mt-4">
      <div className="text-center mb-5">
        <h1 className="fw-bold">🎬 Welcome to CineConnect</h1>
        <p className="text-muted">
          Discover, review, and share your favorite films with other movie lovers.
        </p>
      </div>

      {loading ? (
        <div className="text-center"><Spinner animation="border" /></div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : (
        <>
          {reviews.length > 0 && (
            <>
              <h5 className="text-warning">Reviews</h5>
              <Row className="mb-4">
                {reviews.map((rev) => (
                  <Col key={rev._id} md={6} className="mb-4">
                    <Card className="bg-dark text-white h-100">
                      <Row className="g-0">
                        {resolveMovie(rev.movieId)?.poster && (
                          <Col md={4}>
                            <Card.Img
                              src={resolveMovie(rev.movieId)?.poster}
                              alt="poster"
                              style={{ height: "100%", objectFit: "cover" }}
                            />
                          </Col>
                        )}
                        <Col md={resolveMovie(rev.movieId)?.poster ? 8 : 12}>
                          <Card.Body>
                            <Card.Title>
                              <FaStar className="text-warning me-2" />
                              <a href={`/profile/${rev.author._id}`} className="text-info">
                                {rev.author.username}
                              </a>
                            </Card.Title>
                            <Card.Subtitle>
                              <a href={`/details/${rev.movieId}`} className="text-light fw-bold d-block mb-1">
                                {resolveMovie(rev.movieId)?.title || rev.movieId}
                              </a>
                              <div className="text-warning mb-2">
                                {"★".repeat(rev.rating) + "☆".repeat(5 - rev.rating)} ({rev.rating}/5)
                              </div>
                            </Card.Subtitle>
                            <Card.Text>{rev.comment}</Card.Text>
                          </Card.Body>
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                ))}
              </Row>
            </>
          )}

          {posts.length > 0 && (
            <>
              <h5 className="text-secondary">Posts</h5>
              <Row className="mb-4">
                {posts.map((post) => (
                  <Col key={post._id} md={6} className="mb-4">
                    <Card className="bg-dark text-white h-100 p-3">
                      <Card.Body>
                        <Card.Title>
                          <a href={`/profile/${post.author._id}`} className="text-info">
                            {post.author.username}
                          </a>
                        </Card.Title>
                        <Card.Subtitle>
                          <a href={`/details/${post.movieId}`} className="text-light fw-bold">
                            {resolveMovie(post.movieId)?.title || post.movieId}
                          </a>
                        </Card.Subtitle>
                        <Card.Text>{post.content}</Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </>
          )}

          <h5 className="mb-3">🎥 Recommended Movies</h5>
          <Row className="mb-5">
            {recommendedMovies.map((movie) => (
              <Col key={movie.imdbID} md={3} className="mb-4">
                <Card
                  className="h-100 bg-dark text-white"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/details/${movie.imdbID}`)}
                >
                  <Card.Img
                    variant="top"
                    src={movie.Poster !== "N/A" ? movie.Poster : "https://via.placeholder.com/300x445?text=No+Image"}
                  />
                  <Card.Body>
                    <Card.Title>{movie.Title}</Card.Title>
                    <Card.Text>{movie.Year}</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          <h5 className="mb-3">👥 Featured Users</h5>
          <Row className="mb-5">
            {featuredUsers.map((u) => (
              <Col key={u._id} md={3} className="mb-4">
                <Card className="bg-dark text-white text-center p-3 h-100 border border-secondary">
                  <FaUserCircle size={48} className="text-secondary mb-2" />
                  <Card.Body>
                    <Card.Title>
                      <a href={`/profile/${u._id}`} className="text-info text-decoration-none">
                        {u.username}
                      </a>
                    </Card.Title>
                    <Card.Text className="text-muted">{u.role}</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}
    </Container>
  );
};

export default HomePage;
