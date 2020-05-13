require('dotenv').config();

const client = require('./lib/client');

// Initiate database connection
client.connect();

const app = require('./lib/app');

const PORT = process.env.PORT || 7890;
const ensureAuth = require('./lib/auth/ensure-auth');
const createAuthRoutes = require('./lib/auth/create-auth-routes');
const authRoutes = createAuthRoutes({
  selectUser(email) {
    return client.query(`
            SELECT id, email, hash 
            FROM users
            WHERE email = $1;
        `,
    [email]
    ).then(result => result.rows[0]);
  },
  insertUser(user, hash) {
    return client.query(`
            INSERT into users (email, hash)
            VALUES ($1, $2)
            RETURNING id, email;
        `,
    [user.email, hash]
    ).then(result => result.rows[0]);
  }
});


// setup authentication routes to give user an auth token
// creates a /signin and a /signup route. 
// each requires a POST body with a .email and a .password
app.use('/api/auth', authRoutes);

// everything that starts with "/api" below here requires an auth token!
app.use('/api', ensureAuth);

app.get('/api/test', (req, res) => {
  res.json({
    message: `in this proctected route, we get the user's id like so: ${req.userId}`
  });
});


app.get('/api/todo/', async(req, res) => {
  try {
    const data = await client.query(`
    SELECT * 
    FROM todo
    WHERE todo.user_id=$1;`, [req.userId]);
    res.json(data.rows);
  } catch (e) {
    res.json(e);
  }
});

app.post('/api/todo', async(req, res) => {
  try {
    const data = await client.query(`
  INSERT INTO todo(task_name , user_id, completed)
  VALUES ($1, $2, $3)
  RETURNING *`,  [req.body.task_name, req.userId, req.body.completed]);
    res.json(data.rows);
  } catch(e) {
    res.json(e);
  }
});

app.put('/api/todo/:id', async(req, res) => {
  try {

    
    const data = await client.query(`
    UPDATE todo
    SET completed = true
    WHERE id = $1 
    AND user_id = $2
    RETURNING *`,  [req.params.id, req.userId]);
    res.json(data.rows);
  } catch(e) {
    res.json(e);
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Started on ${PORT}`);
});
module.exports = app;
