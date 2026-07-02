# prisma-docker.ps1
# Lance les commandes Prisma à travers Docker (contourne le bug Prisma/Windows natif)
#
# Usage :
#   .\prisma-docker.ps1 migrate dev --name nom_de_la_migration
#   .\prisma-docker.ps1 studio
#   .\prisma-docker.ps1 db push

param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Args
)

$argsString = $Args -join " "

docker run --rm --network host -v "${PWD}:/app" -w /app node:20-alpine sh -c "npm install -g pnpm > /dev/null 2>&1 && pnpm install --strict-peer-dependencies=false > /dev/null 2>&1 && DATABASE_URL='postgresql://dalem_user:dalem_dev_password@127.0.0.1:5432/dalem_pro_dev' npx prisma $argsString"
