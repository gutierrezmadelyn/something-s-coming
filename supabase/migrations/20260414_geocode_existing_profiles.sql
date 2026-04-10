-- Geocode existing profiles using country capital coordinates
-- This migration updates all profiles that have country but no lat/lng

-- Update profiles with country capital coordinates
UPDATE profiles SET
  lat = CASE TRIM(country)
    WHEN 'El Salvador' THEN 13.6929
    WHEN 'Guatemala' THEN 14.6349
    WHEN 'Honduras' THEN 14.0723
    WHEN 'Peru' THEN -12.0464
    WHEN 'Mexico' THEN 19.4326
    WHEN 'México' THEN 19.4326
    WHEN 'Venezuela' THEN 10.4806
    WHEN 'Colombia' THEN 4.7110
    WHEN 'Republica Dominicana' THEN 18.4861
    WHEN 'Costa Rica' THEN 9.9281
    WHEN 'Panama' THEN 8.9824
    WHEN 'Nicaragua' THEN 12.1364
    WHEN 'Ecuador' THEN -0.1807
    WHEN 'Bolivia' THEN -16.4897
    WHEN 'Chile' THEN -33.4489
    WHEN 'Argentina' THEN -34.6037
    WHEN 'Uruguay' THEN -34.9011
    WHEN 'Paraguay' THEN -25.2637
    WHEN 'Brasil' THEN -15.7975
    WHEN 'Brazil' THEN -15.7975
    WHEN 'Cuba' THEN 23.1136
    WHEN 'Puerto Rico' THEN 18.4655
    WHEN 'España' THEN 40.4168
    WHEN 'Spain' THEN 40.4168
    WHEN 'United States' THEN 38.9072
    WHEN 'USA' THEN 38.9072
    WHEN 'Estados Unidos' THEN 38.9072
    ELSE lat
  END,
  lng = CASE TRIM(country)
    WHEN 'El Salvador' THEN -89.2182
    WHEN 'Guatemala' THEN -90.5069
    WHEN 'Honduras' THEN -87.1921
    WHEN 'Peru' THEN -77.0428
    WHEN 'Mexico' THEN -99.1332
    WHEN 'México' THEN -99.1332
    WHEN 'Venezuela' THEN -66.9036
    WHEN 'Colombia' THEN -74.0721
    WHEN 'Republica Dominicana' THEN -69.9312
    WHEN 'Costa Rica' THEN -84.0907
    WHEN 'Panama' THEN -79.5199
    WHEN 'Nicaragua' THEN -86.2514
    WHEN 'Ecuador' THEN -78.4678
    WHEN 'Bolivia' THEN -68.1193
    WHEN 'Chile' THEN -70.6693
    WHEN 'Argentina' THEN -58.3816
    WHEN 'Uruguay' THEN -56.1645
    WHEN 'Paraguay' THEN -57.5759
    WHEN 'Brasil' THEN -47.8919
    WHEN 'Brazil' THEN -47.8919
    WHEN 'Cuba' THEN -82.3666
    WHEN 'Puerto Rico' THEN -66.1057
    WHEN 'España' THEN -3.7038
    WHEN 'Spain' THEN -3.7038
    WHEN 'United States' THEN -77.0369
    WHEN 'USA' THEN -77.0369
    WHEN 'Estados Unidos' THEN -77.0369
    ELSE lng
  END,
  updated_at = NOW()
WHERE lat IS NULL
  AND country IS NOT NULL
  AND TRIM(country) != '';
