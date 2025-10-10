
// ============================================
// modules/abac/abac.controller.ts
// ============================================
import { Controller, Post, Get, Body, } from '@nestjs/common';
import { AbacService } from './abac.service';
import { CreateAbacAttributeDto, CreateAbacPolicyDto, EvaluatePolicyDto } from './dto/abac.dto';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { CurrentUser } from 'src/core/decorators/public.decorator';

@Controller('abac')
export class AbacController {
  constructor(private abacService: AbacService) {}

  @Post('attributes')
  @Permissions('abac:manage')
  async createAttribute(@Body() dto: CreateAbacAttributeDto) {
    console.log("🚀 ~ AbacController ~ createAttribute ~ dto:", dto)
    return this.abacService.createAttribute(dto);
  }

  @Get('attributes')
  @Permissions('abac:read')
  async findAllAttributes() {
    return this.abacService.findAllAttributes();
  }

  @Post('policies')
  @Permissions('abac:manage')
  async createPolicy(
    @Body() dto: CreateAbacPolicyDto,
    @CurrentUser('id') userId: bigint,
  ) {
    return this.abacService.createPolicy(dto, userId);
  }

  @Post('policies/query')
  @Permissions('abac:read')
  async findAllPolicies(@Body('organizationId') organizationId?: number) {
    return this.abacService.findAllPolicies(
      organizationId ? BigInt(organizationId) : undefined
    );
  }

  @Post('evaluate')
  @Permissions('abac:evaluate')
  async evaluatePolicy(@Body() dto: EvaluatePolicyDto) {
    return this.abacService.evaluatePolicy(dto);
  }
}
