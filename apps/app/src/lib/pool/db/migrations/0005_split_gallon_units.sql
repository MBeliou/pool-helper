-- 'gallons' predates the US/imperial split; existing rows used the US factor (3.785 L)
UPDATE profile SET volume_unit = 'US gal' WHERE volume_unit = 'gallons';
