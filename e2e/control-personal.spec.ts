import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

const completeOnboarding = async (page: Page) => {
  await page
    .getByRole('heading', {
      name: 'Configurar Control Personal',
    })
    .waitFor()

  await page.getByLabel('Nombre').fill('Wuux')
  await page.getByLabel('Moneda principal').fill('GTQ')

  await page
    .getByRole('button', {
      name: 'Finalizar configuracion',
    })
    .click()

  await expect(
    page.getByRole('heading', { name: 'Hoy' }),
  ).toBeVisible()
}

test(
  'completes onboarding and records a habit from the dashboard',
  async ({ page }) => {
    await completeOnboarding(page)

    await expect(page.getByText('Hola, Wuux')).toBeVisible()

    await page
      .getByRole('button', {
        name: /Accion rapida|Nuevo/,
      })
      .first()
      .click()

    await page
      .getByRole('tab', { name: 'Habito' })
      .click()

    await page
      .locator('select[name="value"]')
      .selectOption('30')

    await page
      .getByRole('button', {
        name: 'Guardar habito',
      })
      .click()

    await expect(
      page.getByText('Habito registrado'),
    ).toBeVisible()
  },
)

test(
  'opens and closes finance actions without leaving the page blocked',
  async ({ page, isMobile }) => {
    test.setTimeout(60_000)

    await completeOnboarding(page)

    await page
      .getByRole('link', { name: /Finanzas/ })
      .click()

    await expect(
      page.getByRole('heading', {
        name: 'Finanzas',
      }),
    ).toBeVisible()

    const primaryActions = [
      {
        button: 'Movimiento',
        dialog: 'Nuevo movimiento',
      },
      {
        button: 'Registrar Ingreso',
        dialog: 'Registrar ingreso',
      },
    ]

    for (const action of primaryActions) {
      await page
        .getByRole('button', {
          name: action.button,
          exact: true,
        })
        .click()

      await expect(
        page.getByRole('dialog', {
          name: action.dialog,
        }),
      ).toBeVisible()

      await page
        .getByRole('button', {
          name: 'Cancelar',
          exact: true,
        })
        .click()
    }

    await page
      .locator('details.finance-more-actions > summary')
      .click()

    const secondaryActions = [
      {
        button: 'Cuenta',
        dialog: 'Nueva cuenta',
      },
      {
        button: 'Obligación',
        dialog: 'Nueva obligación',
      },
      {
        button: 'Deuda',
        dialog: 'Nueva deuda',
      },
      {
        button: 'Fondo',
        dialog: 'Nuevo fondo',
      },
    ]

    for (const action of secondaryActions) {
      await page
        .getByRole('button', {
          name: action.button,
          exact: true,
        })
        .click()

      await expect(
        page.getByRole('dialog', {
          name: action.dialog,
        }),
      ).toBeVisible()

      await page
        .getByRole('button', {
          name: 'Cancelar',
          exact: true,
        })
        .click()
    }

    await page
      .getByRole('button', {
        name: 'Cuenta',
        exact: true,
      })
      .click()

    await page
      .getByLabel('Nombre')
      .fill('Cuenta prueba')

    await page
      .getByRole('spinbutton', {
        name: 'Saldo inicial',
      })
      .fill('100')

    await page
      .getByRole('button', {
        name: 'Guardar',
        exact: true,
      })
      .click()

    await page
      .getByRole('button', {
        name: 'Movimiento',
        exact: true,
      })
      .click()

    const movementDialog = page.getByRole('dialog', {
      name: 'Nuevo movimiento',
    })

    await expect(movementDialog).toBeVisible()

    await movementDialog
      .getByRole('spinbutton', {
        name: 'Monto',
        exact: true,
      })
      .fill('25')

    await movementDialog
      .getByLabel(/Descripci[oó]n/i)
      .fill('Gasto probado')

    await movementDialog
      .getByRole('button', {
        name: 'Guardar',
        exact: true,
      })
      .click()

    if (isMobile) {
      await expect(
        page
          .locator('.finance-movement-row')
          .filter({ hasText: 'Gasto probado' }),
      ).toBeVisible()
    } else {
      await expect(
        page.getByRole('cell', {
          name: 'Gasto probado',
          exact: true,
        }),
      ).toBeVisible()
    }
  },
)

test(
  'archives and restores habits without duplicate-key warnings',
  async ({ page }) => {
    const duplicateKeyWarnings: string[] = []

    page.on('console', (message) => {
      if (message.text().includes('same key')) {
        duplicateKeyWarnings.push(message.text())
      }
    })

    await completeOnboarding(page)

    await page
      .getByRole('link', { name: /Habitos/ })
      .click()

    await expect(
      page.getByRole('heading', {
        name: 'Pendientes de hoy',
      }),
    ).toBeVisible()

    const habitCard = page
      .locator('.habits-daily-card')
      .filter({
        hasText: 'Evitar comida chatarra',
      })

    await expect(habitCard).toBeVisible()

    await habitCard
      .getByLabel(
        'Acciones de Evitar comida chatarra',
      )
      .click()

    await habitCard
      .getByRole('button', {
        name: 'Archivar',
        exact: true,
      })
      .click()

    const archivedSection = page
      .locator('details.habits-collapse')
      .filter({
        hasText: 'Hábitos archivados',
      })

    await expect(archivedSection).toBeVisible()

    await archivedSection
      .locator('summary')
      .click()

    const archivedHabit = archivedSection
      .locator('.habits-archived-row')
      .filter({
        hasText: 'Evitar comida chatarra',
      })

    await expect(archivedHabit).toBeVisible()

    await archivedHabit
      .getByRole('button', {
        name: /Restaurar/,
      })
      .click()

    await expect(
      page
        .locator('.habits-daily-card')
        .filter({
          hasText: 'Evitar comida chatarra',
        }),
    ).toBeVisible()

    expect(duplicateKeyWarnings).toEqual([])
  },
)

test(
  'starts, pauses and finishes a work activity',
  async ({ page }) => {
    await completeOnboarding(page)

    await page
      .getByRole('link', { name: /Trabajo/ })
      .click()

    await expect(
      page.locator('.work-page-header h2', {
        hasText: 'Trabajo',
      }),
    ).toBeVisible()

    await page
      .getByRole('button', {
        name: 'Iniciar',
        exact: true,
      })
      .click()

    const timer = page.locator('.work-timer-card')

    await expect(
      timer.getByText('Sesión activa', {
        exact: true,
      }),
    ).toBeVisible()

    await timer
      .getByRole('button', {
        name: 'Pausa +5',
        exact: true,
      })
      .click()

    await expect(
      timer.getByText(/pausa 5 min/i),
    ).toBeVisible()

    await timer
      .getByLabel('Resultado')
      .fill('Prueba Playwright')

    await timer
      .getByLabel('Enfoque')
      .selectOption('5')

    await timer
      .getByRole('button', {
        name: 'Finalizar',
        exact: true,
      })
      .click()

    const finishedSection = page.getByRole(
      'button',
      {
        name: /Sesiones finalizadas/,
      },
    )

    await expect(finishedSection).toBeVisible()
    await finishedSection.click()

    await expect(
      page
        .locator('.work-session-row')
        .filter({
          hasText: 'Prueba Playwright',
        }),
    ).toBeVisible()
  },
)

test(
  'records sleep with bedtime and wake buttons',
  async ({ page }) => {
    await completeOnboarding(page)

    await page
      .getByRole('button', {
        name: /Accion rapida|Nuevo/,
      })
      .first()
      .click()

    await page
      .getByRole('tab', {
        name: /Sue(?:n|ñ)o/i,
      })
      .click()

    await page
      .getByRole('button', {
        name: 'Me voy a dormir',
      })
      .click()

    await expect(
      page.getByText('Hora de dormir guardada'),
    ).toBeVisible()

    await page
      .getByRole('button', {
        name: /Accion rapida|Nuevo/,
      })
      .first()
      .click()

    await page
      .getByRole('tab', {
        name: /Sue(?:n|ñ)o/i,
      })
      .click()

    await expect(
      page.getByText(
        /Sue(?:n|ñ)o en curso/i,
      ),
    ).toBeVisible()

    await page
      .getByRole('button', {
        name: /Despert(?:e|é)/i,
      })
      .click()

    await page
      .getByLabel(
        /Calidad del sue(?:n|ñ)o/i,
      )
      .selectOption('4')

    await page
      .getByLabel(
        /Energ(?:i|í)a al despertar/i,
      )
      .selectOption('4')

    await page
      .getByRole('button', {
        name: /Guardar sue(?:n|ñ)o/i,
      })
      .click()

    await expect(
      page.getByText(
        /Sue(?:n|ñ)o registrado/i,
      ),
    ).toBeVisible()
  },
)

test(
  'deletes a motivational video link with confirmation',
  async ({ page }) => {
    await completeOnboarding(page)

    await page.goto('/#/motivacion')

    await expect(
      page.locator('.motivation-mobile-page'),
    ).toBeVisible()

    await page
      .getByRole('button', {
        name: 'Enlace',
        exact: true,
      })
      .click()

    const createDialog = page.getByRole('dialog', {
      name: /Agregar motivaci[oó]n/i,
    })

    await expect(createDialog).toBeVisible()

    await createDialog
      .getByLabel('Enlace externo')
      .fill('https://example.com/video')

    await createDialog
      .getByRole('button', {
        name: /^Guardar$/,
      })
      .click()

    const libraryButton = page.getByRole(
      'button',
      {
        name: /Biblioteca motivacional/i,
      },
    )

    if (await libraryButton.isVisible()) {
      await libraryButton.click()
    }

    const createdLink = page
      .locator('.motivation-library-card')
      .filter({
        hasText: /Enlace motivacional|example\.com/i,
      })
      .last()

    await expect(createdLink).toBeVisible()

    await createdLink
      .getByRole('button', {
        name: /Eliminar/i,
      })
      .click()

    const confirmDialog = page.getByRole(
      'dialog',
      {
        name: /Eliminar motivaci[oó]n/i,
      },
    )

    await expect(confirmDialog).toBeVisible()

    await confirmDialog
      .getByRole('button', {
        name: 'Eliminar',
        exact: true,
      })
      .click()

    await expect(createdLink).toBeHidden()
  },
)

test(
  'supports core mobile navigation and offline reload after service worker cache',
  async ({ page, context, isMobile }) => {
    test.skip(
      !isMobile,
      'mobile navigation is validated only in the mobile project',
    )

    await completeOnboarding(page)

    await expect(
      page.getByRole('navigation', {
        name: 'Navegacion movil',
      }),
    ).toBeVisible()

    await page
      .getByRole('link', { name: /Finanzas/ })
      .click()

    await expect(
      page.getByRole('heading', {
        name: 'Finanzas',
      }),
    ).toBeVisible()

    await page.waitForLoadState('networkidle')

    await context.setOffline(true)
    await page.reload()

    await expect(
      page.getByRole('heading', {
        name: 'Finanzas',
      }),
    ).toBeVisible()
  },
)