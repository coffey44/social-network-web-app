import { useEffect, useState } from "react";
import {
  Form,
  Button,
  Row,
  Col,
  Card,
  Container,
  Spinner,
} from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaFilm } from "react-icons/fa";

type Movie = {
  imdbID: string;
  Title: string;
  Year: string;
  Poster: string;
};

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchMovies = async (searchTerm: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `https://www.omdbapi.com/?apikey=446aabf2&s=${searchTerm}`
      );
      const data = await response.json();

      if (data.Response === "True") {
        setResults(data.Search);
      } else {
        setError(data.Error || "No results found.");
        setResults([]);
      }
    } catch (err) {
      setError("Failed to fetch results.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setSearchParams({ q: query }); 
    searchMovies(query);
  };

  useEffect(() => {
    if (initialQuery) {
      searchMovies(initialQuery);
    }
  }, [initialQuery]);

  return (
    <Container className="mt-4">
      <h2 className="mb-4 text-center">
        <FaFilm className="me-2" />
        Search Movies
      </h2>

      <Form onSubmit={handleSearch} className="mb-5">
        <Row className="align-items-center">
          <Col xs={9} sm={10} md={10}>
            <Form.Control
              type="text"
              placeholder="Enter movie title..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-100"
            />
          </Col>
          <Col xs={3} sm={2} md={2}>
            <Button type="submit" variant="primary" className="w-100">
              {loading ? <Spinner size="sm" animation="border" /> : "Search"}
            </Button>
          </Col>
        </Row>
      </Form>

      {error && <p className="text-danger text-center">{error}</p>}

      <Row>
        {results.map((movie) => (
          <Col key={movie.imdbID} sm={6} md={4} lg={3} className="mb-4">
            <Card
              onClick={() => navigate(`/details/${movie.imdbID}`)}
              style={{ cursor: "pointer", transition: "transform 0.2s" }}
              className="h-100"
            >
              <Card.Img
                variant="top"
                src={
                  movie.Poster !== "N/A"
                    ? movie.Poster
                    : "https://via.placeholder.com/300x445?text=No+Image"
                }
              />
              <Card.Body>
                <Card.Title className="fs-6 mb-1">{movie.Title}</Card.Title>
                <Card.Text className="text-muted">{movie.Year}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
};

export default SearchPage;
