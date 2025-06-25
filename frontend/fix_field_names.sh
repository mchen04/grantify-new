#!/bin/bash
# Script to fix field name mismatches in frontend

echo "Fixing field name mismatches in frontend..."

# Field name mappings (old -> new)
# agency_name -> funding_organization_name
# award_ceiling -> funding_amount_max
# award_floor -> funding_amount_min
# close_date -> application_deadline
# description_short -> summary
# description_full -> description

# Fix in all TypeScript/JavaScript files
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i.bak \
  -e "s/'agency_name'/'funding_organization_name'/g" \
  -e 's/"agency_name"/"funding_organization_name"/g' \
  -e "s/\.agency_name/.funding_organization_name/g" \
  -e "s/'award_ceiling'/'funding_amount_max'/g" \
  -e 's/"award_ceiling"/"funding_amount_max"/g' \
  -e "s/\.award_ceiling/.funding_amount_max/g" \
  -e "s/'award_floor'/'funding_amount_min'/g" \
  -e 's/"award_floor"/"funding_amount_min"/g' \
  -e "s/\.award_floor/.funding_amount_min/g" \
  -e "s/'close_date'/'application_deadline'/g" \
  -e 's/"close_date"/"application_deadline"/g' \
  -e "s/\.close_date/.application_deadline/g" \
  -e "s/'description_short'/'summary'/g" \
  -e 's/"description_short"/"summary"/g' \
  -e "s/\.description_short/.summary/g" \
  -e "s/'description_full'/'description'/g" \
  -e 's/"description_full"/"description"/g' \
  -e "s/\.description_full/.description/g" \
  {} +

# Remove backup files
find src -name "*.bak" -delete

echo "Field name fixes complete!"
echo "Files updated:"
grep -r "funding_organization_name\|funding_amount_max\|application_deadline\|summary" src --include="*.ts" --include="*.tsx" | grep -v "interface Grant" | wc -l