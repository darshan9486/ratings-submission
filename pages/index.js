import React, { useState, useEffect, useRef } from 'react';
import {
  Container, Typography, TextField, Button, Box, Paper, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Link, MenuItem, Select, Snackbar, Alert, IconButton
} from '@mui/material';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const RATING_OPTIONS = [
  'AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-',
  'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-',
  'B+', 'B', 'B-', 'CCC+', 'CCC', 'CCC-', 'CC', 'C', 'D'
];

// Helper to compare ratings
const ratingOrder = RATING_OPTIONS;
const getRatingIndex = (rating) => ratingOrder.indexOf(rating);

// Sort assets by consensus rating (AAA first)
const sortedAssets = (assets) => {
  const sorted = [...assets].sort((a, b) => {
    const aIdx = getRatingIndex(a.consensusMetrics.consensusRating);
    const bIdx = getRatingIndex(b.consensusMetrics.consensusRating);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });
  return sorted;
};

// Credora-inspired dark theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#000000',
      paper: '#1B2A41',
    },
    primary: {
      main: '#00E1C0', // Credora teal accent
      contrastText: '#0A2540',
    },
    secondary: {
      main: '#F5F7FA',
    },
    text: {
      primary: '#F5F7FA',
      secondary: '#B0B8C1',
    },
    error: {
      main: '#FF5A5F',
    },
  },
  typography: {
    fontFamily: 'Inter, Open Sans, Arial, sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: 1,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 24px 0 rgba(10,37,64,0.12)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#16213A',
          color: '#F5F7FA',
          fontWeight: 700,
          fontSize: '0.87rem',
          padding: '4px 6px',
        },
        body: {
          fontSize: '0.84rem',
          padding: '4px 6px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 700,
          fontSize: '0.95rem',
          letterSpacing: 1,
          padding: '6px 12px',
        },
      },
    },
  },
});

function App() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [assets, setAssets] = useState([]); // Will be populated from API
  const [loading, setLoading] = useState(true);
  const [selectedRatings, setSelectedRatings] = useState({}); // { assetId: rating }
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const submitRef = useRef(null);

  useEffect(() => {
    console.log('App useEffect: fetching /api/assets...');
    setLoading(true);
    fetch('/api/assets')
      .then(res => {
        console.log('Received response from /api/assets:', res);
        return res.json();
      })
      .then(data => {
        console.log('Parsed JSON from /api/assets:', data);
        if (Array.isArray(data)) {
          setAssets(data);
        } else {
          setAssets([]);
          setSnackbar({ open: true, message: data.error || 'Failed to load assets.', severity: 'error' });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching /api/assets:', err);
        setAssets([]);
        setLoading(false);
        setSnackbar({ open: true, message: 'Failed to load assets.', severity: 'error' });
      });
  }, []);

  const handleRatingChange = (assetId, value) => {
    setSelectedRatings(prev => ({ ...prev, [assetId]: value }));
  };

  const handleRemoveAsset = (assetId) => {
    setAssets(prev => prev.filter(asset => asset.id !== assetId));
    setSelectedRatings(prev => {
      const newRatings = { ...prev };
      delete newRatings[assetId];
      return newRatings;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Submit all visible assets, using selected rating or consensus if not selected
    const ratingsToSubmit = assets.map(asset => ({
      id: asset.id,
      symbol: asset.symbol,
      selectedRating: selectedRatings[asset.id] || asset.consensusMetrics.consensusRating,
      consensusRating: asset.consensusMetrics.consensusRating,
      credoraRating: asset.credoraMetrics.rating,
    }));
    if (!name || !email || ratingsToSubmit.length === 0) {
      setSnackbar({ open: true, message: 'Please fill all fields and rate at least one asset.', severity: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      console.log('Submitting ratings:', { name, email, ratings: ratingsToSubmit });
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, ratings: ratingsToSubmit })
      });
      console.log('Received response from /api/submit:', res);
      if (res.ok) {
        setSnackbar({ open: true, message: 'Ratings submitted successfully!', severity: 'success' });
        setSelectedRatings({});
        setName('');
        setEmail('');
      } else {
        const data = await res.json();
        console.error('Error response from /api/submit:', data);
        setSnackbar({ open: true, message: data.error || 'Submission failed.', severity: 'error' });
      }
    } catch (err) {
      console.error('Error submitting ratings:', err);
      setSnackbar({ open: true, message: 'Submission failed.', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to get background color for rating cell
  const getRatingBgColor = (selected, consensus) => {
    if (!selected || !consensus) return undefined;
    const selectedIdx = getRatingIndex(selected);
    const consensusIdx = getRatingIndex(consensus);
    if (selectedIdx === -1 || consensusIdx === -1) return undefined;
    if (selectedIdx < consensusIdx) return '#1bbd7e33'; // light green for higher
    if (selectedIdx > consensusIdx) return '#ff5a5f33'; // light red for lower
    return undefined;
  };

  // Helper to format PD as percent
  const formatPercent = (val) => {
    if (typeof val !== 'number') return '';
    return (val * 100).toFixed(2) + '%';
  };

  // Scroll to submit button
  const handleScrollToSubmit = () => {
    if (submitRef.current) {
      submitRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary', py: 6 }}>
        <Container maxWidth="md">
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, mb: 4, borderRadius: 4 }}>
            <Typography variant="h4" gutterBottom align="center" sx={{ mb: 2, color: 'primary.main' }}>
              Asset Ratings Submission
            </Typography>
            <Typography variant="subtitle1" gutterBottom align="center" sx={{ color: 'text.secondary' }}>
              Please enter your name and email, then rate the assets below.
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                variant="filled"
                sx={{ input: { color: 'text.primary' }, bgcolor: 'background.paper', borderRadius: 1 }}
              />
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                variant="filled"
                sx={{ input: { color: 'text.primary' }, bgcolor: 'background.paper', borderRadius: 1 }}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 1 }}>
                <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600, mb: 0.5 }}>
                  Click to scroll down and submit
                </Typography>
                <ArrowDownwardIcon
                  onClick={handleScrollToSubmit}
                  sx={{ cursor: 'pointer', color: 'primary.main', fontSize: 32, transition: 'color 0.2s', '&:hover': { color: 'secondary.main' } }}
                  aria-label="Scroll to submit"
                />
              </Box>
              <Box sx={{ my: 4 }}>
                <Typography variant="h6" sx={{ color: 'primary.main', mb: 1 }}>Assets</Typography>
                {loading ? (
                  <CircularProgress color="primary" />
                ) : (
                  <TableContainer component={Paper} sx={{ maxHeight: '70vh', overflow: 'auto', bgcolor: 'background.paper', borderRadius: 2 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Symbol</TableCell>
                          <TableCell>Consensus Rating</TableCell>
                          <TableCell>Consensus PD</TableCell>
                          <TableCell>Credora Rating</TableCell>
                          <TableCell>Credora PD</TableCell>
                          <TableCell>Report</TableCell>
                          <TableCell>Your Rating</TableCell>
                          <TableCell>Remove</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sortedAssets(assets).map((asset, idx) => {
                          const selected = selectedRatings[asset.id];
                          const consensus = asset.consensusMetrics.consensusRating;
                          return (
                            <TableRow key={asset.id} sx={{ bgcolor: idx % 2 === 0 ? 'background.default' : '#16213A' }}>
                              <TableCell>{asset.symbol}</TableCell>
                              <TableCell>{consensus}</TableCell>
                              <TableCell>{formatPercent(asset.consensusMetrics.consensusPd)}</TableCell>
                              <TableCell>{asset.credoraMetrics.rating}</TableCell>
                              <TableCell>{formatPercent(asset.credoraMetrics.pd)}</TableCell>
                              <TableCell>
                                {asset.credoraMetrics.report ? (
                                  <Link href={asset.credoraMetrics.report} target="_blank" rel="noopener" sx={{ color: 'primary.main', fontWeight: 600 }}>
                                    Report
                                  </Link>
                                ) : (
                                  ''
                                )}
                              </TableCell>
                              <TableCell sx={{ backgroundColor: getRatingBgColor(selected, consensus), borderRadius: 1, minWidth: 90 }}>
                                <Select
                                  size="small"
                                  value={selected || ''}
                                  displayEmpty
                                  onChange={e => handleRatingChange(asset.id, e.target.value)}
                                  renderValue={val => val || consensus}
                                  sx={{ bgcolor: 'background.paper', borderRadius: 1, fontSize: '0.84rem', minWidth: 60, height: 32 }}
                                  MenuProps={{ PaperProps: { sx: { maxHeight: 250 } } }}
                                >
                                  <MenuItem value="">
                                    <em>{consensus}</em>
                                  </MenuItem>
                                  {RATING_OPTIONS.map(opt => (
                                    <MenuItem key={opt} value={opt} sx={{ fontSize: '0.84rem' }}>{opt}</MenuItem>
                                  ))}
                                </Select>
                              </TableCell>
                              <TableCell sx={{ minWidth: 36, textAlign: 'center', p: 0 }}>
                                <IconButton aria-label="remove" color="error" onClick={() => handleRemoveAsset(asset.id)} size="small" sx={{ p: 0.5 }}>
                                  <RemoveCircleOutlineIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={submitting}
                sx={{ py: 1.5, mt: 2, fontWeight: 700, fontSize: '1.2rem', borderRadius: 2 }}
                ref={submitRef}
              >
                {submitting ? 'Submitting...' : 'Submit Ratings'}
              </Button>
              <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
                  {snackbar.message}
                </Alert>
              </Snackbar>
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App; 