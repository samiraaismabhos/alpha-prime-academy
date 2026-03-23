import "./App.css";
import { useEffect, useState } from "react";

function App() {
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [token, setToken] = useState(localStorage.getItem("token") || "");

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      loadMyCourses(token);
    } else {
      localStorage.removeItem("token");
      setMyCourses([]);
    }
  }, [token]);

  const loadCourses = async () => {
    try {
      const res = await fetch("http://localhost:5000/courses");
      const data = await res.json();

      if (!res.ok) {
        setError("Kurslar yüklənmədi");
        return;
      }

      setCourses(data);
    } catch (err) {
      console.error(err);
      setError("Backend ilə əlaqə qurulmadı");
    }
  };

  const loadMyCourses = async (userToken) => {
    try {
      const res = await fetch("http://localhost:5000/my-courses", {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      const data = await res.json();

      if (!res.ok) return;

      setMyCourses(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await fetch("http://localhost:5000/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: registerEmail.split("@")[0] || "student",
          email: registerEmail,
          password: registerPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Register alınmadı");
        return;
      }

      setSuccess("Qeydiyyat uğurlu oldu. İndi login ola bilərsən.");
      setRegisterEmail("");
      setRegisterPassword("");
    } catch (err) {
      console.error(err);
      setError("Register zamanı xəta baş verdi");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login alınmadı");
        return;
      }

      setToken(data.token);
      setSuccess("Login uğurlu oldu");
      setLoginEmail("");
      setLoginPassword("");
    } catch (err) {
      console.error(err);
      setError("Login zamanı xəta baş verdi");
    }
  };

  const handleLogout = () => {
    setToken("");
    setSuccess("Çıxış edildi");
    setError("");
  };

  const handleEnroll = async (courseId) => {
    if (!token) {
      setError("Əvvəl login ol");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const res = await fetch(`http://localhost:5000/enroll/${courseId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Enroll alınmadı");
        return;
      }

      setSuccess("Kursa uğurla yazıldın");
      loadMyCourses(token);
    } catch (err) {
      console.error(err);
      setError("Enroll zamanı xəta baş verdi");
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Alpha Prime Academy</h1>
        <p className="small">
          Professional programming courses, real enrollment system, and personal dashboard.
        </p>
      </div>

      <div className="grid">
        <div className="form-box">
          <h2>Register</h2>
          <form onSubmit={handleRegister}>
            <input
              className="input"
              type="email"
              placeholder="Email address"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
            />

            <input
              className="input"
              type="password"
              placeholder="Password"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
            />

            <button className="button" type="submit">
              Register
            </button>
          </form>
        </div>

        <div className="form-box">
          <h2>Student Login</h2>

          {!token ? (
            <form onSubmit={handleLogin}>
              <input
                className="input"
                type="email"
                placeholder="Email address"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />

              <input
                className="input"
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />

              <button className="button" type="submit">
                Login
              </button>
            </form>
          ) : (
            <>
              <p className="small">
                <b>Status:</b> Logged in
              </p>
              <button className="button" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}

          {success && <p className="small">{success}</p>}
          {error && <p className="small">{error}</p>}
        </div>
      </div>

      <h2 className="section-title">Available Courses</h2>
      <div className="grid">
        {courses.map((course) => (
          <div className="card" key={course.id}>
            <h3>{course.title}</h3>
            <p>{course.description}</p>
            <p>
              <b>Level:</b> {course.level}
            </p>
            <p>
              <b>Price:</b> ${course.price}
            </p>

            <button className="button" onClick={() => handleEnroll(course.id)}>
              Enroll Now
            </button>
          </div>
        ))}
      </div>

      <h2 className="section-title">My Courses</h2>
      <div className="grid">
        {myCourses.length === 0 ? (
          <p className="small">Hələ heç bir kursa yazılmamısan.</p>
        ) : (
          myCourses.map((course) => (
            <div className="my-card" key={course.id}>
              <h3>{course.title}</h3>
              <p>{course.description}</p>
              <p>
                <b>Level:</b> {course.level}
              </p>
              <p>
                <b>Price:</b> ${course.price}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;