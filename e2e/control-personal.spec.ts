import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

const completeOnboarding = async (page: Page) => {
  await page.getByRole('heading', { name: 'Configurar Control Personal' }).waitFor()
  await page.getByLabel('Nombre').fill('Wuux')
  await page.getByLabel('Moneda principal').fill('GTQ')
  await page.getByRole('button', { name: 'Finalizar configuracion' }).click()
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible()
}

test('completes onboarding and records a habit from the dashboard', async ({ page }) => {
  await completeOnboarding(page)

  await expect(page.getByText('Hola, Wuux')).toBeVisible()

  await page.getByRole('button', { name: /Accion rapida|Nuevo/ }).first().click()
  await page.getByRole('tab', { name: 'Habito' }).click()
  await page.locator('select[name="value"]').selectOption('30')
  await page.getByRole('button', { name: 'Guardar habito' }).click()

  await expect(page.getByText('Habito registrado')).toBeVisible()
})

test('opens and closes finance actions without leaving the page blocked', async ({ page, isMobile }) => {
  test.setTimeout(60_000)
  await completeOnboarding(page)
  await page.getByRole('link', { name: /Finanzas/ }).click()
  await expect(page.getByRole('heading', { name: 'Finanzas' })).toBeVisible()

  const actions = [
    { button: 'Movimiento', dialog: 'Movement' },
    { button: 'Me pagaron', dialog: 'Paycheck' },
    { button: 'Cuenta', dialog: 'Account' },
    { button: 'Obligacion', dialog: 'Obligation' },
    { button: 'Deuda', dialog: 'Debt' },
    { button: 'Fondo', dialog: 'Fund' },
    { button: 'Presupuesto', dialog: 'Budget' },
  ]

  for (const action of actions) {
    await page.getByRole('button', { name: action.button, exact: true }).click()
    await expect(page.getByRole('dialog', { name: action.dialog })).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(page.getByRole('dialog', { name: action.dialog })).toBeHidden()
  }

  await page.getByRole('button', { name: 'Cuenta' }).click()
  await page.getByLabel('Nombre').fill('Cuenta prueba')
  await page.getByRole('spinbutton', { name: 'Saldo inicial' }).fill('100')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.locator('.list-row').filter({ hasText: 'Cuenta prueba' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Movimiento' })).toBeVisible()

  await page.getByRole('button', { name: 'Movimiento' }).click()
  const movementDialog = page.getByRole('dialog', { name: 'Movement' })
  await expect(movementDialog).toBeVisible()
  await movementDialog.getByRole('spinbutton', { name: 'Monto', exact: true }).fill('25')
  await movementDialog.getByLabel('Descripcion').fill('Gasto probado')
  await movementDialog.getByRole('button', { name: 'Guardar' }).click()
  if (isMobile) {
    await expect(page.locator('.mobile-card').filter({ hasText: 'Gasto probado' })).toBeVisible()
  } else {
    await expect(page.getByRole('cell', { name: 'Gasto probado' })).toBeVisible()
  }
})

test('archives and restores habits without duplicate-key warnings', async ({ page }) => {
  const duplicateKeyWarnings: string[] = []
  page.on('console', (message) => {
    if (message.text().includes('same key')) duplicateKeyWarnings.push(message.text())
  })

  await completeOnboarding(page)
  await page.getByRole('link', { name: /Habitos/ }).click()
  await expect(page.getByRole('heading', { name: 'Vista diaria' })).toBeVisible()

  const habitCard = page.locator('.habit-card').filter({ hasText: 'Evitar comida chatarra' })
  await habitCard.getByRole('button', { name: /Archivar/ }).click()
  await expect(page.getByRole('heading', { name: 'Habitos archivados' })).toBeVisible()
  await page.locator('.mobile-card').filter({ hasText: 'Evitar comida chatarra' }).getByRole('button', { name: 'Desarchivar' }).click()
  await expect(habitCard).toBeVisible()
  expect(duplicateKeyWarnings).toEqual([])
})

test('starts, pauses and finishes a work activity', async ({ page }) => {
  await completeOnboarding(page)
  await page.getByRole('link', { name: /Trabajo/ }).click()
  await expect(page.getByRole('heading', { name: 'Trabajo', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Iniciar' }).click()
  await expect(page.getByText('Sesion activa')).toBeVisible()
  await page.getByRole('button', { name: 'Pausa +5 min' }).click()
  await expect(page.getByText(/pausa acumulada 5 min/)).toBeVisible()
  await page.getByLabel('Resultado').fill('Prueba Playwright')
  await page.getByLabel('Enfoque').selectOption('5')
  await page.getByRole('button', { name: 'Finalizar actividad' }).click()

  await expect(page.getByRole('heading', { name: 'Sesiones finalizadas' })).toBeVisible()
  await expect(page.getByText('Prueba Playwright')).toBeVisible()
})

test('records sleep with bedtime and wake buttons', async ({ page }) => {
  await completeOnboarding(page)

  await page.getByRole('button', { name: /Accion rapida|Nuevo/ }).first().click()
  await page.getByRole('tab', { name: 'Sueno' }).click()
  await page.getByRole('button', { name: 'Me voy a dormir' }).click()
  await expect(page.getByText('Hora de dormir guardada')).toBeVisible()

  await page.getByRole('button', { name: /Accion rapida|Nuevo/ }).first().click()
  await page.getByRole('tab', { name: 'Sueno' }).click()
  await expect(page.getByText('Sueno en curso')).toBeVisible()
  await page.getByRole('button', { name: 'Desperte' }).click()
  await page.getByLabel('Calidad del sueno').selectOption('4')
  await page.getByLabel('Energia al despertar').selectOption('4')
  await page.getByRole('button', { name: 'Guardar sueno' }).click()

  await expect(page.getByText('Sueno registrado')).toBeVisible()
})

test('deletes a motivational video link with confirmation', async ({ page }) => {
  await completeOnboarding(page)
  await page.goto('/#/motivacion')
  await expect(page.getByRole('heading', { name: 'Biblioteca motivacional' })).toBeVisible()

  await page.getByLabel('Enlace externo').fill('https://example.com/video')
  await page.getByRole('button', { name: 'Guardar enlace' }).click()
  const createdLink = page.locator('.mobile-card').filter({ hasText: 'Enlace motivacional' }).last()
  await expect(createdLink).toBeVisible()

  await createdLink.getByRole('button', { name: 'Eliminar' }).click()
  const confirmDialog = page.getByRole('dialog', { name: 'Eliminar motivacion' })
  await expect(confirmDialog).toBeVisible()
  await confirmDialog.getByRole('button', { name: 'Eliminar' }).click()
  await expect(createdLink).toBeHidden()
})

test('supports core mobile navigation and offline reload after service worker cache', async ({ page, context, isMobile }) => {
  test.skip(!isMobile, 'mobile navigation is validated only in the mobile project')

  await completeOnboarding(page)
  await expect(page.getByRole('navigation', { name: 'Navegacion movil' })).toBeVisible()

  await page.getByRole('link', { name: /Finanzas/ }).click()
  await expect(page.getByRole('heading', { name: 'Finanzas' })).toBeVisible()

  await page.waitForLoadState('networkidle')
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Finanzas' })).toBeVisible()
})
