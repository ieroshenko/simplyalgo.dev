-- First update all problems to use consolidated categories
UPDATE problems SET category_id = (SELECT id FROM categories WHERE name = 'Array & Hashing' LIMIT 1)
WHERE category_id IN (SELECT id FROM categories WHERE name IN ('Array', 'Hash Table'));

UPDATE problems SET category_id = (SELECT id FROM categories WHERE name = 'Graphs' LIMIT 1)
WHERE category_id IN (SELECT id FROM categories WHERE name IN ('Graph', 'Advanced Graphs'));

UPDATE problems SET category_id = (SELECT id FROM categories WHERE name = 'Trees' LIMIT 1)
WHERE category_id IN (SELECT id FROM categories WHERE name = 'Tree');

UPDATE problems SET category_id = (SELECT id FROM categories WHERE name = 'Intervals' LIMIT 1)
WHERE category_id IN (SELECT id FROM categories WHERE name = 'Interval');

UPDATE problems SET category_id = (SELECT id FROM categories WHERE name = 'Math & Geometry' LIMIT 1)
WHERE category_id IN (SELECT id FROM categories WHERE name = 'Math');

UPDATE problems SET category_id = (SELECT id FROM categories WHERE name = 'Dynamic Programming' LIMIT 1)
WHERE category_id IN (SELECT id FROM categories WHERE name IN ('1-D Dynamic Programming', '2-D Dynamic Programming'));

UPDATE problems SET category_id = (SELECT id FROM categories WHERE name = 'Heap / Priority Queue' LIMIT 1)
WHERE category_id IN (SELECT id FROM categories WHERE name = 'Heap');

-- Now delete duplicate categories (only those not referenced)
DELETE FROM categories WHERE name IN ('Array', 'Graph', 'Advanced Graphs', 'Tree', 'Interval', 'Math', '1-D Dynamic Programming', '2-D Dynamic Programming', 'Heap', 'Hash Table', 'String')
AND id NOT IN (SELECT DISTINCT category_id FROM problems WHERE category_id IS NOT NULL);