import express from 'express';
import path from 'path';

// Routes
import deliveryRouter from './routes/delivery';
import adminRouter from './routes/admin';
import advertiserRouter from './routes/advertiser';
import publisherRouter from './routes/publisher';

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routing
app.use('/admin', adminRouter);
app.use('/advertiser', advertiserRouter);
app.use('/publisher', publisherRouter);
app.use('/', deliveryRouter);

app.listen(PORT, () => {
  console.log(`AdNetwork Server running at http://localhost:${PORT}`);
});
