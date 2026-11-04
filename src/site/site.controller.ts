import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SiteService } from './site.service';

@ApiTags('Site')
@Controller('site')
export class SiteController {
  constructor(private readonly site: SiteService) {}

  @Get('settings')
  @ApiOperation({
    summary: 'Public shop settings (marquee, payments, shipping)',
  })
  settings() {
    return this.site.publicSettings();
  }

  @Get('hero')
  @ApiOperation({ summary: 'Home page hero banner content' })
  @ApiResponse({ status: 200, description: 'Headline, copy, CTA and image' })
  async hero() {
    const hero = await this.site.getHero();
    return this.site.toPublic(hero);
  }
}
